from pathlib import Path

source = Path("prisma/schema.prisma").read_text()
target = source.replace('provider = "sqlite"', 'provider = "postgresql"')
Path("prisma/schema.postgresql.prisma").write_text(target)
print("Wrote prisma/schema.postgresql.prisma")
