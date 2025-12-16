export function compareRoutines(oldRoutine: any, newRoutine: any) {
    const changes: any = {};

    // Helper to compare primitive values
    const compareValues = (key: string, oldVal: any, newVal: any) => {
        if (oldVal !== newVal) {
            // Handle null/undefined vs empty string as same if needed, but strict for now
            // Special case for arrays handled separately
            if (Array.isArray(oldVal) || Array.isArray(newVal)) return;

            changes[key] = { old: oldVal, new: newVal };
        }
    };

    // 1. Compare Top-Level Fields
    const topLevelKeys = [
        'routine_name', 'routine_display_name', 'version', 'routine_group',
        'routine_type', 'capital_structure', 'to_show', 'display_in_dropdown'
    ];

    // Also compare JSON fields that are stored as strings/objects at top level
    // fund_types and helper_routines might be arrays

    topLevelKeys.forEach(key => {
        compareValues(key, oldRoutine[key], newRoutine[key]);
    });

    // Compare arrays (fund_types, helper_routines)
    const compareSimpleArrays = (key: string) => {
        const oldArr = oldRoutine[key] || [];
        const newArr = newRoutine[key] || [];
        if (JSON.stringify(oldArr) !== JSON.stringify(newArr)) {
            changes[key] = { old: oldArr, new: newArr };
        }
    };
    compareSimpleArrays('fund_types');
    compareSimpleArrays('helper_routines');
    compareSimpleArrays('region');


    // 2. Compare Child Arrays (Reports, Mappings, etc.)
    // Generic helper for child arrays with ID
    const compareChildArray = (key: string, idField: string = 'id') => {
        const oldChildren = oldRoutine[key] || [];
        const newChildren = newRoutine[key] || [];
        const childChanges: any = { added: [], removed: [], modified: [] };
        let hasChanges = false;

        const oldMap = new Map(oldChildren.map((c: any) => [c[idField], c]));
        const newMap = new Map(newChildren.map((c: any) => [c[idField], c]));

        // Check for added
        newChildren.forEach((child: any) => {
            if (!oldMap.has(child[idField])) {
                childChanges.added.push(child);
                hasChanges = true;
            }
        });

        // Check for removed
        oldChildren.forEach((child: any) => {
            if (!newMap.has(child[idField])) {
                childChanges.removed.push(child);
                hasChanges = true;
            }
        });

        // Check for modified
        newChildren.forEach((newChild: any) => {
            const oldChild = oldMap.get(newChild[idField]);
            if (oldChild) {
                const itemChanges: any = {};
                let itemHasChanges = false;

                // Compare all keys in the child object
                const allKeys = new Set([...Object.keys(newChild), ...Object.keys(oldChild)]);
                allKeys.forEach(k => {
                    if (k === idField || k === 'routine_id' || k === 'cdm_mapping_id' || k === 'output_sheet_id') return; // Skip IDs/FKs

                    // Loose equality for numbers/strings mismatch (e.g. "1" vs 1) if needed, but strict is safer
                    if (JSON.stringify(newChild[k]) !== JSON.stringify(oldChild[k])) {
                        itemChanges[k] = { old: oldChild[k], new: newChild[k] };
                        itemHasChanges = true;
                    }
                });

                if (itemHasChanges) {
                    childChanges.modified.push({ id: newChild[idField], changes: itemChanges });
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            changes[key] = {};
            if (childChanges.added.length > 0) changes[key].added = childChanges.added;
            if (childChanges.removed.length > 0) changes[key].removed = childChanges.removed;
            if (childChanges.modified.length > 0) changes[key].modified = childChanges.modified;
        }
    };

    compareChildArray('reports');
    compareChildArray('mappings');
    compareChildArray('attributes');
    compareChildArray('outputSheets');
    compareChildArray('sheetDetails');
    compareChildArray('userInputs');

    return changes;
}
