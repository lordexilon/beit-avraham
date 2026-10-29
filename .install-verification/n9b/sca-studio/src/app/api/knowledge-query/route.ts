import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.SCA_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SCA_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const { query, project_name, match_threshold = 0.5, match_count = 5, query_embedding } = await request.json();
    
    if (!query_embedding || !project_name) {
      return NextResponse.json({ error: 'Missing query_embedding or project_name' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // RPC a la función fsca.match_knowledge creada en el INIT SQL
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: query_embedding,
      match_threshold: match_threshold,
      match_count: match_count,
      p_project_name: project_name
    });

    if (error) {
      console.error('RPC Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
