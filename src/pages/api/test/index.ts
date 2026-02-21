export async function GET({ url }: { url: URL }) {
    return new Response(JSON.stringify({
        success: true,
        receivedUrl: url.toString(),
        searchParams: Object.fromEntries(url.searchParams.entries())
    }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
