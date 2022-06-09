import {persistentAtom} from "@nanostores/persistent";
import supabase_conf from "../configs/supabase_conf";

export const supabaseURL = persistentAtom("magicbroad_supabase.url", supabase_conf.url);

export const supabaseKey = persistentAtom("magicbroad_supabase.key", supabase_conf.key);
