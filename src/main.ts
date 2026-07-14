import { Plugin, Editor, Menu, Notice } from 'obsidian';
import { CheckboxPluginSettings, DEFAULT_SETTINGS, getActiveStates, normalizeStateOrder, UNCHECKED_CHAR } from './checkbox-states';
import { CheckboxPluginSettingTab } from './settings';
import { findCheckboxOnLine, getCheckboxLineAndColumn, isTaskLine } from './detector';
import { populateCheckboxSubmenu, replaceCheckbox } from './menu';
import { attachReadingModeMenu } from './reading-mode';

/** Body class that gates the per-status rules in styles.css. */
const STATUS_STYLES_CLASS = 'checkbox-context-menu-styles';

export default class CheckboxContextMenuPlugin extends Plugin {
    settings: CheckboxPluginSettings;

    async onload() {
        await this.loadSettings();

        this.applyStatusStyles();
        // Ensure the body class never lingers if the plugin is disabled.
        this.register(() => activeDocument.body.classList.remove(STATUS_STYLES_CLASS));

        const tab = new CheckboxPluginSettingTab(this.app, this);
        tab.setPlugin(this);
        this.addSettingTab(tab);

        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
                const cursor = getCheckboxLineAndColumn(editor);
                if (!cursor) return;

                const lineText = editor.getLine(cursor.line);
                if (!lineText || !isTaskLine(lineText)) return;

                const match = findCheckboxOnLine(lineText, cursor.column);
                if (!match) return;

                const states = getActiveStates(this.settings);
                menu.addItem((item) => {
                    item.setTitle('Change checkbox state');
                    item.setIcon('check-square');
                    const submenu = item.setSubmenu();
                    populateCheckboxSubmenu(submenu, editor, cursor.line, match, states, this.settings);
                });
            })
        );

        // Reading (preview) mode: no Editor exists, so attach handlers to the
        // rendered checkboxes and edit the file directly.
        this.registerMarkdownPostProcessor((element, context) => {
            attachReadingModeMenu(this.app, () => this.settings, element, context);
        });

        this.addCommand({
            id: 'cycle-checkbox-state',
            name: 'Cycle checkbox state',
            editorCallback: (editor: Editor) => {
                const cursor = getCheckboxLineAndColumn(editor);
                if (!cursor) {
                    new Notice('No checkbox on this line');
                    return;
                }

                const lineText = editor.getLine(cursor.line);
                if (!lineText || !isTaskLine(lineText)) {
                    new Notice('No checkbox on this line');
                    return;
                }

                const match = findCheckboxOnLine(lineText, cursor.column);
                if (!match) {
                    new Notice('No checkbox found on this line');
                    return;
                }

                const states = getActiveStates(this.settings);
                const currentChar = match.currentState.replace('[', '').replace(']', '');
                const currentIndex = states.findIndex(s => s.char === currentChar);

                const nextIndex = (currentIndex + 1) % states.length;
                const nextState = states[nextIndex];

                replaceCheckbox(editor, cursor.line, match, nextState.char);
            },
        });
    }

    onunload(): void {
        // Cleanup is handled by register* methods
    }

    /**
     * Toggle the body class that enables the per-status checkbox styling in
     * styles.css, following the `injectStatusStyles` setting. Called on load and
     * whenever the setting changes.
     */
    applyStatusStyles(): void {
        activeDocument.body.classList.toggle(STATUS_STYLES_CLASS, this.settings.injectStatusStyles);
    }

    async loadSettings() {
        const raw: unknown = await this.loadData();
        const loaded = (raw != null && typeof raw === 'object') ? (raw as Partial<CheckboxPluginSettings>) : null;
        this.settings = { ...DEFAULT_SETTINGS };

        if (loaded) {
            this.settings.enabledStates = loaded.enabledStates ?? DEFAULT_SETTINGS.enabledStates;
            this.settings.stateOverrides = loaded.stateOverrides ?? DEFAULT_SETTINGS.stateOverrides;
            this.settings.customStates = loaded.customStates ?? DEFAULT_SETTINGS.customStates;
            this.settings.showIcons = loaded.showIcons ?? DEFAULT_SETTINGS.showIcons;
            this.settings.highlightCurrent = loaded.highlightCurrent ?? DEFAULT_SETTINGS.highlightCurrent;
            this.settings.sortAlphabetically = loaded.sortAlphabetically ?? DEFAULT_SETTINGS.sortAlphabetically;
            this.settings.injectStatusStyles = loaded.injectStatusStyles ?? DEFAULT_SETTINGS.injectStatusStyles;
            this.settings.stateOrder = loaded.stateOrder ?? DEFAULT_SETTINGS.stateOrder;
            this.migrateEmptyUncheckedChar();
        }

        // Drop removed chars, append newly known ones (also seeds pre-1.1
        // settings files that have no stateOrder).
        this.settings.stateOrder = normalizeStateOrder(this.settings);
    }

    /**
     * Early versions used "" for the unchecked state, which serialized to the
     * invalid `[]` (no space). Rewrite any persisted "" to a single space so
     * existing vaults keep the unchecked state enabled and rendering `[ ]`.
     */
    private migrateEmptyUncheckedChar(): void {
        this.settings.enabledStates = this.settings.enabledStates.map(
            (c) => (c === '' ? UNCHECKED_CHAR : c),
        );
        this.settings.stateOrder = this.settings.stateOrder.map(
            (c) => (c === '' ? UNCHECKED_CHAR : c),
        );

        if (Object.prototype.hasOwnProperty.call(this.settings.stateOverrides, '')) {
            this.settings.stateOverrides[UNCHECKED_CHAR] = this.settings.stateOverrides[''];
            delete this.settings.stateOverrides[''];
        }
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
