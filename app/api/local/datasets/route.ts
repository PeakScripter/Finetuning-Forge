
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
    try {
        const datasetsDir = join(process.cwd(), 'datasets');
        try {
            const files = await readdir(datasetsDir);
            const datasets = await Promise.all(
                files
                    .filter(file => file.endsWith('.jsonl') || file.endsWith('.csv') || file.endsWith('.txt'))
                    .map(async (file) => {
                        const stats = await stat(join(datasetsDir, file));
                        return {
                            id: file,
                            name: file,
                            size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                            type: file.split('.').pop()?.toUpperCase()
                        };
                    })
            );

            return Response.json({ datasets });
        } catch {
            return Response.json({ datasets: [] });
        }
    } catch (error) {
        return Response.json({ error: 'Failed to fetch datasets' }, { status: 500 });
    }
}
