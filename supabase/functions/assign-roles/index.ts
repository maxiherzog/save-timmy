import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Body = {
  playerIds?: string[];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const ids = Array.isArray(body.playerIds) ? body.playerIds : [];
    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: "playerIds required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const imposterIndex = Math.floor(Math.random() * ids.length);
    const imposterId = ids[imposterIndex];
    const assignments = ids.map((id) => ({
      playerId: id,
      role: id === imposterId ? "imposter" : "rescuer",
    }));
    return new Response(
      JSON.stringify({ imposterId, assignments }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String((e as Error).message ?? e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
