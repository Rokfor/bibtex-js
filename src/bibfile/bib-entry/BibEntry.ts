import {Authors, mustBeAuthors} from "./bibliographic-entity/Authors";
import {
    findError,
    hasMandatoryFields,
    mandatoryFields
} from "./bibliographic-entity/mandatory-and-optional-fields";
import {resolveStringReference} from "./BibStringEntry";
import {FieldValue, normalizeFieldValue, parseFieldValue} from "../datatype/KeyVal";

/**
 * Represents a single "@[entityName]" entity, not a special entity such as @string
 */
export class BibEntry {
    readonly type: string;
    readonly _id: string;

    readonly fields: EntryFields;
    // noinspection JSUnusedGlobalSymbols
    readonly fields$: EntryFields;

    /**
     * When sorting, BibTEX computes a string, named
     sort.key$, for each entry. The sort.key$ string is an (often long) string defining the order
     in which entries will be sorted. To avoid any ambiguity, sort.key$ should only contain alphanumeric
     characters. Classical non-alphanumeric characters23, except special characters, will
     be removed by a BibTEX function named purify$. For special characters, purify$ removes
     spaces and LATEX commands (strings beginning with a backslash), even those placed between
     brace pairs. Everything else is left unmodified. For instance, t\^ete, t{\^e}te and t{\^{e}}te
     are transformed into tete, while tête gives tête; Bib{\TeX} gives Bib and Bib\TeX becomes
     BibTeX. There are thirteen LATEX commands that won’t follow the above rules: \OE, \ae, \AE,
     \aa, \AA, \o, \O, \l, \L, \ss. Those commands correspond to ı, , œ, Œ, æ, Æ, å, Å, ø, Ø, ł, Ł,
     ß, and purify$ transforms them (if they are in a special character, in i, j, oe, OE, ae, AE, aa,
     AA, o, O, l, L, ss, respectively.
     */
    readonly sortkey$: string;

    /**
     the second transformation applied to a title is to be turned to lower case (except the first character).
     The function named change.case$ does this job. But it only applies to letters that are
     a brace depth 0, except within a special character. In a special character, brace depth is always
     0, and letters are switched to lower case, except LATEX commands, that are left unmodified.
     */
    readonly title$: string;

    constructor(type: string, id: string, fields: EntryFields) {
        this.type = type;
        this._id = id;

        this.fields = fields;


        // TODO implement; see above
        this.sortkey$ = "";
        this.title$ = "";
    }

    getField(key: string): FieldValue | undefined {
        return this.fields[key];
    }

    getFieldAsString(key: string): string | number| undefined {
        const field: FieldValue | undefined = this.getField(key);
        return normalizeFieldValue(field);
    }

    getAuthors(): Authors | undefined {
        const field = this.fields["author"];
        if (field === undefined) return field;
        return mustBeAuthors(field);
    }
}


export interface EntryFields {
    [k: string]: FieldValue;
}

export function parseEntryFields(fields: any): EntryFields {
    const fieldz: EntryFields = {};
    Object.keys(fields).forEach(key => {
        switch (key) {
            default:
                fieldz[key] = parseFieldValue(fields[key]);
                break;
        }
    });
    return fieldz;
}




// export function parseComplexStringOuter(obj: any): OuterQuotedString | OuterBracedString | number {
//     if (isString(obj)) return [obj];
//
//     switch (mustBeString(obj.type)) {
//         case "quotedstringwrapper":
//         case "bracedstringwrapper":
//             if (!isArray(obj.data))
//                 throw new Error("Expect array for data: " + JSON.stringify(obj));
//
//             return obj.data.map(parseStringy);
//         default:
//             throw new Error("Unexpected complex string type: " + obj.type);
//     }
// }


export function isBibEntry(x: any): x is BibEntry {
    return typeof x["type"] === "string"
        && typeof x["_id"] === "string"
        && !!x["fields"];
}

export function processEntry(entry: BibEntry, strings$: { [p: string]: FieldValue }) {
    // TODO do something with this?
    // if (hasMandatoryFields(entry.type))
    //     mandatoryFields[entry.type]
    //         .map(e => findError(entry, e))
    //         .forEach(e => {
    //             if (!!e) console.warn(e.message);
    //         })
    //     ;

    const processedFields: EntryFields = {};

    const fields$ = entry.fields;

    Object.keys(entry.fields).forEach((key: string) => {
        const field$ = resolveStringReference({}, processedFields, strings$, fields$[key]);
        switch (key) {
            case "author":
                processedFields[key] = new Authors(field$);
                break;
            case "title":
                processedFields[key] = (field$);
                break;
            case "incollection":
                // TODO cross reference
            default:
                processedFields[key] = field$;
                break;
        }
    });


    return new BibEntry(
        entry.type,
        entry._id,
        processedFields
    );
}
