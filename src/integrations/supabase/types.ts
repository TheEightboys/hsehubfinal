export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = any;

export type Tables<T extends string> = any;

export type Enums<T extends string> = any;
