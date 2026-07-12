import type { Plugin } from 'obsidian';
import { PluginSettingTab, Setting, Notice } from 'obsidian';
import { CheckboxState, CheckboxPluginSettings, DEFAULT_STATES, UNCHECKED_CHAR } from './checkbox-states';

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
            .setDesc('Enable or disable each built-in checkbox state. You can also override its label and icon.')
            .setHeading();

        DEFAULT_STATES.forEach((state) => {
            const isEnabled = settings.enabledStates.includes(state.char);
            const override = settings.stateOverrides[state.char] ?? {};

            const setting = new Setting(containerEl)
                .setName(`${state.icon} ${this.getResolvedLabel(state, settings)}`)
                .setDesc(`Renders as: ${describeChar(state.char)}`);

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
                    this.display();
                }));

            setting.addText((text) => text
                .setPlaceholder('Custom label')
                .setValue(override.label ?? '')
                .onChange(async (value: string) => {
                    settings.stateOverrides[state.char] = {
                        ...(settings.stateOverrides[state.char] ?? {}),
                        label: value || undefined,
                        icon: settings.stateOverrides[state.char]?.icon,
                    };
                    await this.plugin.saveSettings();
                    this.display();
                }));

            setting.addText((text) => text
                .setPlaceholder('Custom icon')
                .setValue(override.icon ?? '')
                .onChange(async (value: string) => {
                    settings.stateOverrides[state.char] = {
                        ...(settings.stateOverrides[state.char] ?? {}),
                        label: settings.stateOverrides[state.char]?.label,
                        icon: value || undefined,
                    };
                    await this.plugin.saveSettings();
                    this.display();
                }));
        });
    }

    addCustomStatesSection(containerEl: HTMLElement, settings: CheckboxPluginSettings): void {
        new Setting(containerEl)
            .setName('Custom states')
            .setDesc('Add your own checkbox states with a unique character, label, and icon.')
            .setHeading();

        if (settings.customStates.length === 0) {
            new Setting(containerEl)
                .setDesc('No custom states defined yet.');
        }

        settings.customStates.forEach((customState: CheckboxState, index: number) => {
            const setting = new Setting(containerEl);

            const nameSpan: HTMLSpanElement = setting.controlEl.createSpan();
            nameSpan.textContent = `${customState.icon ?? '?'} ${customState.label}`;
            setting.descEl.createSpan().textContent = `Renders as: ${describeChar(customState.char)}`;

            setting.addButton((btn) => btn
                .setButtonText('Remove')
                .setWarning()
                .onClick(async () => {
                    const newCustom = [...settings.customStates];
                    newCustom.splice(index, 1);
                    settings.customStates = newCustom;
                    settings.enabledStates = settings.enabledStates.filter((c: string) => c !== customState.char);
                    delete settings.stateOverrides[customState.char];
                    await this.plugin.saveSettings();
                    this.display();
                }));
        });

        if (settings.customStates.length > 0) {
            new Setting(containerEl);
        }

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
                    }

                    await this.plugin.saveSettings();
                    this.display();
                }));
    }

    getResolvedLabel(state: CheckboxState, settings: CheckboxPluginSettings): string {
        const override = settings.stateOverrides[state.char];
        return override?.label ?? state.label;
    }
}
