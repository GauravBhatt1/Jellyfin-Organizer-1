import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function getMediaDuration(filePath: string): Promise<number | null> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { timeout: 10000 }
    );
    
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      return null;
    }
    
    return Math.round(duration);
  } catch (error) {
    console.error(`Failed to get duration for ${filePath}:`, error);
    return null;
  }
}
