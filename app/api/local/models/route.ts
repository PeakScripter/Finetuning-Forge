
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
    try {
        const modelsDir = join(process.cwd(), 'models');
        // Ensure dir exists or just try to read
        try {
            const files = await readdir(modelsDir, { withFileTypes: true });
            // Filter for specific model types or folders
            const models = files
                .filter(dirent => dirent.isDirectory() || dirent.name.endsWith('.gguf') || dirent.name.endsWith('.bin') || dirent.name.endsWith('.safetensors') || dirent.name.endsWith('.safetensor'))
                .map(dirent => ({
                    id: dirent.name,
                    name: dirent.name,
                    type: dirent.isDirectory() ? 'Local Dir' : dirent.name.split('.').pop()?.toUpperCase() || 'Model',
                    size: 'Unknown' // Could stat size if needed
                }));

            return Response.json({ models });
        } catch (error) {
            // If directory doesn't exist, return empty
            return Response.json({ models: [] });
        }
    } catch (error) {
        return Response.json({ error: 'Failed to fetch models' }, { status: 500 });
    }
}
