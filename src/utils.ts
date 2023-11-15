export const toObject = <T=any>(data: any) => {
    if (Buffer.isBuffer(data)) return JSON.parse(data.toString()) as T;
    if (typeof data === 'object') return data as T;
    if (typeof data === 'string') return JSON.parse(data) as T;
    // return String(data);
};
export function trimQuote(str: string) {
    const quotes:string[][]=[
        [
            '"',
            '"',
        ],
        [
            "'",
            "'",
        ],
        [
            '`',
            '`',
        ],
        [
            '“',
            '”',
        ],
        [
            '‘',
            '’',
        ]
    ]
    for(let i=0;i<quotes.length;i++){
        const [start,end]=quotes[i];
        if(str.startsWith(start)&&str.endsWith(end)){
            return str.slice(1,-1);
        }
    }
    return str;
}
