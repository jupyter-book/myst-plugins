interface AttrDef<T> {
    default?: T | null;
    validate(val: unknown): boolean;
}

export const boolean = (
    opts: {
        optional?: boolean;
        default?: boolean;
    } = {},
): AttrDef<boolean> => ({
    default: opts.default,
    validate(val) {
        return (opts.optional && val === undefined) || typeof val === "boolean";
    },
});

export const string = (
    opts: {
        optional?: boolean;
        default?: string;
    } = {},
): AttrDef<string> => ({
    default: opts.default ?? (opts.optional ? null : undefined),
    validate(val) {
        return (opts.optional && val === undefined) || typeof val === "string";
    },
});

export const integer = (
    opts: {
        optional?: boolean;
        default?: number;
    } = {},
): AttrDef<number> => ({
    default: opts.default,
    validate(val) {
        return (opts.optional && val === undefined) || Number.isInteger(val);
    },
});

export const oneOf = <T>(opts: {
    optional?: boolean;
    default?: T;
    values: T[];
}): AttrDef<T> => ({
    default: opts.default,
    validate(val) {
        return (
            (opts.optional && val === undefined) ||
            (opts.values as unknown[]).includes(val)
        );
    },
});
