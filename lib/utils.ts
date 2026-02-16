type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | Record<string, boolean | undefined>;

export function cn(...inputs: ClassValue[]): string {
  const flatten = (acc: string[], val: ClassValue): string[] => {
    if (val == null || val === false) return acc;
    if (typeof val === "string") return [...acc, val];
    if (Array.isArray(val)) return val.reduce(flatten, acc);
    if (typeof val === "object")
      return [
        ...acc,
        ...Object.entries(val)
          .filter(([, v]) => v)
          .map(([k]) => k),
      ];
    return acc;
  };
  return inputs
    .reduce(flatten, [] as string[])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
