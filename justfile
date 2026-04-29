# subhatch development commands

default:
    @just --list

# format JS source files with Biome
format:
    biome format --write api/ src/

# check formatting and lint (no write)
check:
    biome check api/ src/

# auto-fix formatting and lint issues
fix:
    biome check --write api/ src/

# run Node.js adapter locally
run:
    ADMIN_PASSWORD=admin SUB_TOKEN=test node api/node.js

# build Docker image
docker-build:
    docker build -t subhatch .

# run Docker container (needs ADMIN_PASSWORD set or passed)
docker-run:
    docker run -d --name subhatch -p 3000:3000 -v subhatch-data:/data -e ADMIN_PASSWORD=${ADMIN_PASSWORD:?set ADMIN_PASSWORD} -e SUB_TOKEN=${SUB_TOKEN:-} --restart unless-stopped subhatch

# stop and remove Docker container
docker-stop:
    docker stop subhatch || true
    docker rm subhatch || true

# clean generated files
clean:
    rm -f data.json
