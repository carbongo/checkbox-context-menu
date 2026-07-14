import type { Plugin } from 'obsidian';
import { PluginSettingTab, Setting, Notice } from 'obsidian';
import { CheckboxState, CheckboxPluginSettings, DEFAULT_STATES, UNCHECKED_CHAR, getOrderedStates, normalizeStateOrder } from './checkbox-states';

/** Human-readable description of the markdown a state char renders as. */
function describeChar(char: string): string {
    if (char === UNCHECKED_CHAR) return '[ ] (empty)';
    return `[${char}]`;
}

interface CheckboxContextMenuPluginRef extends Plugin {
    settings: CheckboxPluginSettings;
    saveSettings(): Promise<void>;
    applyStatusStyles(): void;
}

export class CheckboxPluginSettingTab extends PluginSettingTab {
    plugin: CheckboxContextMenuPluginRef;

    setPlugin(plugin: CheckboxContextMenuPluginRef): void {
        this.plugin = plugin;
    }

    display(): void {
        this.render();
    }

    /**
     * Build the pane. Internal re-renders call this directly rather than the
     * deprecated display() (the marketplace scan flags every display() call
     * site). Never call from a text input's onChange — see docs/settings-tab.md.
     */
    private render(): void {
        const { containerEl } = this;
        containerEl.empty();

        const settings = this.plugin.settings;

        this.addMenuAppearanceSection(containerEl, settings);
        this.addStatusStylesSection(containerEl, settings);
        this.addCheckboxStatesSection(containerEl, settings);
        this.addCustomStatesSection(containerEl, settings);
    }

    addStatusStylesSection(containerEl: HTMLElement, settings: CheckboxPluginSettings): void {
        new Setting(containerEl)
            .setName('Checkbox styling')
            .setHeading();

        new Setting(containerEl)
            .setName('Inject status styles')
            .setDesc(
                'Colour and glyph each checkbox state (half-done, deferred, ' +
                'scheduled, important, cancelled) in the editor and reading view. ' +
                'Turn off if your theme or snippet already styles these states.',
            )
            .addToggle((toggle) => toggle
                .setValue(settings.injectStatusStyles)
                .onChange(async (value: boolean) => {
                    settings.injectStatusStyles = value;
                    await this.plugin.saveSettings();
                    this.plugin.applyStatusStyles();
                }));
    }

    addMenuAppearanceSection(containerEl: HTMLElement, settings: CheckboxPluginSettings): void {
        new Setting(containerEl)
            .setName('Menu appearance')
            .setHeading();

        new Setting(containerEl)
            .setName('Show icons in menu')
            .addToggle((toggle) => toggle
                .setValue(settings.showIcons)
                .onChange(async (value: boolean) => {
                    settings.showIcons = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Highlight current state')
            .addToggle((toggle) => toggle
                .setValue(settings.highlightCurrent)
                .onChange(async (value: boolean) => {
                    settings.highlightCurrent = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Sort states alphabetically')
            .addToggle((toggle) => toggle
                .setValue(settings.sortAlphabetically)
                .onChange(async (value: boolean) => {
                    settings.sortAlphabetically = value;
                    await this.plugin.saveSettings();
                }));
    }

    addCheckboxStatesSection(containerEl: HTMLElement, settings: CheckboxPluginSettings): void {
        new Setting(containerEl)
            .setName('Checkbox states')
            .setDesc(
                'Enable or disable each checkbox state and override its label and icon. ' +
                'Drag the ⠿ handle to reorder the context menu (ignored while ' +
                'alphabetical sort is on).',
            )
            .setHeading();

        const listEl = containerEl.createDiv({ cls: 'checkbox-context-menu-state-list' });

        getOrderedStates(settings).forEach((state) => {
            this.addStateRow(listEl, settings, state);
        });
    }

    private addStateRow(listEl: HTMLElement, settings: CheckboxPluginSettings, state: CheckboxState): void {
        const isEnabled = settings.enabledStates.includes(state.char);
        const isCustom = !DEFAULT_STATES.some((s) => s.char === state.char);
        const override = settings.stateOverrides[state.char] ?? {};

        const setting = new Setting(listEl)
            .setDesc(`Renders as: ${describeChar(state.char)}`);
        setting.settingEl.dataset.stateChar = state.char;

        // Re-render the row's own title without rebuilding the pane — a full
        // display() per keystroke destroys the focused input.
        const refreshName = () => {
            const o = settings.stateOverrides[state.char] ?? {};
            setting.setName(`${o.icon ?? state.icon ?? ''} ${o.label ?? state.label}`.trim());
        };
        refreshName();

        this.attachDragHandle(setting, settings);

        setting.addToggle((toggle) => toggle
            .setValue(isEnabled)
            .onChange(async (value: boolean) => {
                if (value) {
                    if (!settings.enabledStates.includes(state.char)) {
                        settings.enabledStates = [...settings.enabledStates, state.char];
                    }
                } else {
                    settings.enabledStates = settings.enabledStates.filter((c: string) => c !== state.char);
                }
                await this.plugin.saveSettings();
            }));

        setting.addText((text) => text
            .setPlaceholder('Custom label')
            .setValue(override.label ?? '')
            .onChange(async (value: string) => {
                settings.stateOverrides[state.char] = {
                    ...(settings.stateOverrides[state.char] ?? {}),
                    label: value || undefined,
                };
                refreshName();
                await this.plugin.saveSettings();
            }));

        setting.addText((text) => text
            .setPlaceholder('Custom icon')
            .setValue(override.icon ?? '')
            .onChange(async (value: string) => {
                settings.stateOverrides[state.char] = {
                    ...(settings.stateOverrides[state.char] ?? {}),
                    icon: value || undefined,
                };
                refreshName();
                await this.plugin.saveSettings();
            }));

        if (isCustom) {
            setting.addButton((btn) => btn
                .setButtonText('Remove')
                .setDestructive()
                .onClick(async () => {
                    settings.customStates = settings.customStates.filter((s) => s.char !== state.char);
                    settings.enabledStates = settings.enabledStates.filter((c: string) => c !== state.char);
                    settings.stateOrder = settings.stateOrder.filter((c: string) => c !== state.char);
                    delete settings.stateOverrides[state.char];
                    await this.plugin.saveSettings();
                    this.render();
                }));
        }
    }

    /** Prepend a ⠿ grip to the row and wire up HTML5 drag-and-drop reordering. */
    private attachDragHandle(setting: Setting, settings: CheckboxPluginSettings): void {
        const rowEl = setting.settingEl;
        rowEl.addClass('checkbox-context-menu-state-row');

        const handle = setting.nameEl.createSpan({
            cls: 'checkbox-context-menu-drag-handle',
            text: '⠿',
        });
        setting.nameEl.prepend(handle);

        // Only the grip arms dragging, so text inputs keep normal selection.
        handle.addEventListener('mousedown', () => { rowEl.draggable = true; });
        handle.addEventListener('touchstart', () => { rowEl.draggable = true; });

        rowEl.addEventListener('dragstart', (ev: DragEvent) => {
            ev.dataTransfer?.setData('text/plain', rowEl.dataset.stateChar ?? '');
            rowEl.addClass('checkbox-context-menu-dragging');
        });
        rowEl.addEventListener('dragend', () => {
            rowEl.draggable = false;
            rowEl.removeClass('checkbox-context-menu-dragging');
            rowEl.parentElement?.querySelectorAll('.checkbox-context-menu-drop-target')
                .forEach((el) => el.removeClass('checkbox-context-menu-drop-target'));
        });
        rowEl.addEventListener('dragover', (ev: DragEvent) => {
            ev.preventDefault();
            rowEl.addClass('checkbox-context-menu-drop-target');
        });
        rowEl.addEventListener('dragleave', () => {
            rowEl.removeClass('checkbox-context-menu-drop-target');
        });
        rowEl.addEventListener('drop', (ev: DragEvent) => {
            ev.preventDefault();
            const draggedChar = ev.dataTransfer?.getData('text/plain');
            const targetChar = rowEl.dataset.stateChar;
            if (draggedChar == null || targetChar == null || draggedChar === targetChar) return;
            void this.moveState(settings, draggedChar, targetChar);
        });
    }

    /** Reorder stateOrder so draggedChar takes targetChar's position. */
    private async moveState(settings: CheckboxPluginSettings, draggedChar: string, targetChar: string): Promise<void> {
        const order = normalizeStateOrder(settings);
        const from = order.indexOf(draggedChar);
        const to = order.indexOf(targetChar);
        if (from === -1 || to === -1) return;

        order.splice(from, 1);
        order.splice(to, 0, draggedChar);
        settings.stateOrder = order;

        await this.plugin.saveSettings();
        this.render();
    }

    addCustomStatesSection(containerEl: HTMLElement, settings: CheckboxPluginSettings): void {
        new Setting(containerEl)
            .setName('Custom states')
            .setDesc('Add your own checkbox states with a unique character, label, and icon. They appear in the list above.')
            .setHeading();

        const formSetting = new Setting(containerEl)
            .setName('Add custom state')
            .setDesc('Define a new checkbox state.')
            .addText((text) => text
                .setPlaceholder('Character (single char)')
            )
            .addText((text) => text.setPlaceholder('Label'))
            .addText((text) => text.setPlaceholder('Icon'))
            .addButton((btn) => btn
                .setButtonText('Add')
                .onClick(async () => {
                    const inputEls = formSetting.controlEl.querySelectorAll<HTMLInputElement>('input[type="text"]');
                    if (inputEls.length < 3) return;

                    const [charInput, labelInput, iconInput] = inputEls as unknown as HTMLInputElement[];
                    const char = charInput.value;
                    const label = labelInput.value.trim();
                    const icon = iconInput.value.trim();

                    if (char.length !== 1 || char === ' ') {
                        new Notice('Character must be exactly one non-space character.');
                        return;
                    }

                    if (DEFAULT_STATES.some((s: CheckboxState) => s.char === char)) {
                        new Notice(`"${char}" is already a built-in state — edit it above instead.`);
                        return;
                    }

                    if (!label) {
                        new Notice('Label is required.');
                        return;
                    }

                    const existingIndex = settings.customStates.findIndex((s: CheckboxState) => s.char === char);
                    if (existingIndex !== -1) {
                        settings.customStates[existingIndex] = { char, label, icon };
                    } else {
                        settings.customStates = [...settings.customStates, { char, label, icon }];
                        if (!settings.enabledStates.includes(char)) {
                            settings.enabledStates = [...settings.enabledStates, char];
                        }
                        settings.stateOrder = normalizeStateOrder(settings);
                    }

                    await this.plugin.saveSettings();
                    this.render();
                }));
    }

}
