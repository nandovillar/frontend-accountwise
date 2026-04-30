import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zarozbzicgteiouvkiwy.supabase.co";
const supabaseKey = "sb_publishable_XEJm4I6n8Fn5PoiYsGh4xw_SIVOfYE4";

export const supabase = createClient(supabaseUrl, supabaseKey);
