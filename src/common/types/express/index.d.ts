import 'express';

declare module 'express' {
    export interface Request {
        cookies: {
            [key: string]: string;
        };
    }
}


declare function ms(value: number, options?: { long: boolean }): string;


declare function ms(value: ms.StringValue): number;

declare namespace ms {

    type Unit =
        | "Years"
        | "Year"
        | "Yrs"
        | "Yr"
        | "Y"
        | "Weeks"
        | "Week"
        | "W"
        | "Days"
        | "Day"
        | "D"
        | "Hours"
        | "Hour"
        | "Hrs"
        | "Hr"
        | "H"
        | "Minutes"
        | "Minute"
        | "Mins"
        | "Min"
        | "M"
        | "Seconds"
        | "Second"
        | "Secs"
        | "Sec"
        | "s"
        | "Milliseconds"
        | "Millisecond"
        | "Msecs"
        | "Msec"
        | "Ms";

    type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;

    type StringValue =
        | `${number}`
        | `${number}${UnitAnyCase}`
        | `${number} ${UnitAnyCase}`;
}

export = ms;