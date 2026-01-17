import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
    try {
        // Extended query to get GPU name, memory, temperature, power, and utilization
        const { stdout } = await execAsync(
            'nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw --format=csv,noheader,nounits'
        );

        const gpus = stdout
            .trim()
            .split('\n')
            .map((line, index) => {
                const [name, memoryTotal, memoryUsed, memoryFree, utilization, temperature, power] = line.split(',').map((s) => s.trim());
                return {
                    id: `gpu-${index}`,
                    name: name || `Unknown GPU ${index}`,
                    vram: memoryTotal ? `${memoryTotal} MB` : 'Unknown',
                    vramUsed: memoryUsed ? parseInt(memoryUsed, 10) : 0,
                    vramFree: memoryFree ? parseInt(memoryFree, 10) : 0,
                    vramTotal: memoryTotal ? parseInt(memoryTotal, 10) : 0,
                    utilization: utilization ? parseInt(utilization, 10) : 0,
                    temperature: temperature ? parseInt(temperature, 10) : 0,
                    power: power ? parseFloat(power) : 0,
                };
            });

        if (gpus.length === 0) {
            return NextResponse.json({ gpus: [] });
        }

        return NextResponse.json({ gpus });
    } catch (error) {
        console.error('Error detecting GPUs:', error);
        // Return empty list instead of error 500 to allow UI to show fallback
        return NextResponse.json({
            gpus: [],
            error: "Could not execute nvidia-smi. Ensure NVIDIA drivers are installed."
        });
    }
}
