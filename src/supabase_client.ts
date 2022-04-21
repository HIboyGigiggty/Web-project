import supabase_conf from './configs/supabase_conf'
import { createClient } from '@supabase/supabase-js'

const supabase_client = createClient(supabase_conf.url, supabase_conf.key);

export default supabase_client;
