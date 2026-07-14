import type { Menu } from 'obsidian';

// `setSubmenu` exists at runtime but is not part of Obsidian's published typings.
declare module 'obsidian' {
    interface MenuItem {
        setSubmenu(): Menu;
    }
}
