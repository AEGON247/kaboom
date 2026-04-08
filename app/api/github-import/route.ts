import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo'); 

  if (!repo || !repo.includes('/')) {
    return NextResponse.json({ error: 'Invalid repo format. Use "owner/repo".' }, { status: 400 });
  }

  const [owner, name] = repo.split('/');


  const branches = ['main', 'master', 'dev', 'develop'];
  const paths = [
    'index.js',
    'index.ts',
    'src/index.js',
    'src/index.ts',
    'lib/index.js',
    'lib/index.ts',
    'app.js',
    'main.js'
  ];

  const candidates: string[] = [];
  for (const branch of branches) {
    for (const path of paths) {
      candidates.push(`https://raw.githubusercontent.com/${owner}/${name}/${branch}/${path}`);
    }
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'KABOOM-Deploy/1.0',
          'Accept': 'text/plain',
        },

        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const code = await res.text();

        if (code.length > 20) {
          const parts = url.split('/');
          const branch = parts[5];
          const fileName = parts.slice(6).join('/');

          return NextResponse.json({
            code,
            source: url,
            file: fileName,
            branch: branch,
            success: true
          });
        }
      }
    } catch {

    }
  }

  return NextResponse.json(
    {
      error: `Could not find an entry file (index.js/ts, main.js) in ${repo}. Make sure it's a public repository.`,
    },
    { status: 404 }
  );
}
