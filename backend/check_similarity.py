from sentence_transformers import SentenceTransformer
m = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu')

pairs = [
    ('Redis GET returns stale data after PATCH', "Redis isn't reflecting my PATCH update"),
    ('Docker container cannot reach postgres on localhost', 'ECONNREFUSED 127.0.0.1:5432 inside container'),
    ('Works locally but fails inside the container', 'Docker service unreachable from other container'),
    ('JWT token expires too fast', 'Authentication token lifetime is too short'),
    ('Webpack build fails with module not found', 'Vite cannot resolve import path'),
]

for a, b in pairs:
    e1 = m.encode([a], normalize_embeddings=True)[0]
    e2 = m.encode([b], normalize_embeddings=True)[0]
    cos = float((e1 * e2).sum())
    print(f'{cos:.3f} | {a[:50]}... ~ {b[:50]}...')