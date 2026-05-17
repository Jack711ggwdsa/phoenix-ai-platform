import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export const Route = createFileRoute('/api/public/n8n/client-ai-settings')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apiKey = request.headers.get('x-phoenix-api-key')
        const expected = process.env.PHOENIX_N8N_API_KEY
        if (!expected || !apiKey || apiKey !== expected) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const url = new URL(request.url)
        const clientId = url.searchParams.get('client_id')
        if (!clientId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
          return new Response(JSON.stringify({ error: 'Invalid or missing client_id' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const { data, error } = await supabaseAdmin
          .from('client_submissions')
          .select('client_name, client_email, business_information, services_products, promotion, faq, ai_reply_style, preferred_languages, lead_collection_rules, business_hours, important_notes, submitted_at')
          .eq('client_id', clientId)
          .eq('submission_kind', 'ai_settings')
          .eq('status', 'completed')
          .is('archived_at', null)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (!data) {
          return new Response(JSON.stringify({ error: 'No completed AI settings found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
