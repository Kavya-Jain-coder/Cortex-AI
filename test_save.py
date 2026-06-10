import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Simulate login or just try an open route if possible, or use the local backend directly.
        # Actually, let's just test the regex on a 1MB payload to see if it causes catastrophic backtracking.
        import re
        import time
        
        payload = "<!-- CORTEX_CANVAS: " + "A" * 1000000 + " -->"
        start = time.time()
        res = re.sub(r'<!-- CORTEX_CANVAS: .*? -->', '', payload, flags=re.DOTALL)
        print("Regex time:", time.time() - start)
        
        payload2 = "Some text\n" + payload + "\nMore text\n" + "<!-- CORTEX_CANVAS: " + "B" * 1000000 + " -->"
        start = time.time()
        res2 = re.sub(r'<!-- CORTEX_CANVAS: .*? -->', '', payload2, flags=re.DOTALL)
        print("Regex2 time:", time.time() - start)

asyncio.run(main())
