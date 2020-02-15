export function sleep(timeInMilliseconds: number): Promise<void> {
    timeInMilliseconds = timeInMilliseconds > 0 ? timeInMilliseconds : 0;
    return new Promise(resolve => { setTimeout(resolve, timeInMilliseconds) });
}
