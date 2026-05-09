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

# ─────────────────────────────────────────────
#  API tests (requires "just run" in another tab)
#  Default credentials: ADMIN_PASSWORD=admin SUB_TOKEN=test
# ─────────────────────────────────────────────

BASE := "http://localhost:3000"
PW := "admin"
SUB := "test"

# run all test recipes
test-all: test-ping test-login test-login-wrong test-save-nodes test-get-nodes test-sub-url test-rotate-token test-sub test-list-tokens test-create-token test-scoped-sub test-delete-token test-logout

# GET /api/ping — health check
test-ping:
	curl -s {{BASE}}/api/ping | jq

# POST /api/login — correct password
test-login:
	#!/usr/bin/env bash
	curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq

# POST /api/login — wrong password
test-login-wrong:
	#!/usr/bin/env bash
	curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"wrong"}' | jq

# GET /api/nodes — list all nodes
test-get-nodes:
	#!/usr/bin/env bash
	TOKEN=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	curl -s {{BASE}}/api/nodes -H "Authorization: Bearer $TOKEN" | jq

# PUT /api/nodes — save nodes
test-save-nodes:
	#!/usr/bin/env bash
	TOKEN=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	curl -s -X PUT {{BASE}}/api/nodes \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $TOKEN" \
		-d '{"nodes":["vless://abc-def@1.2.3.4:443?encryption=none#Tokyo","vmess://YmFzZTY0"]}' | jq

# GET /sub — subscription content
test-sub:
	curl -s "{{BASE}}/sub?token={{SUB}}"

# GET /api/sub-url — subscription URL
test-sub-url:
	#!/usr/bin/env bash
	TOKEN=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	curl -s {{BASE}}/api/sub-url -H "Authorization: Bearer $TOKEN" | jq

# POST /api/logout — end session
test-logout:
	#!/usr/bin/env bash
	TOKEN=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	curl -s -X POST {{BASE}}/api/logout -H "Authorization: Bearer $TOKEN" | jq

# PUT /api/sub-token — rotate token
test-rotate-token:
	#!/usr/bin/env bash
	TOKEN=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	curl -s -X PUT {{BASE}}/api/sub-token -H "Authorization: Bearer $TOKEN" | jq

# GET /api/sub-tokens — list all tokens
test-list-tokens:
	#!/usr/bin/env bash
	TOKEN=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	curl -s {{BASE}}/api/sub-tokens -H "Authorization: Bearer $TOKEN" | jq

# POST /api/sub-tokens — create scoped token
test-create-token:
	#!/usr/bin/env bash
	TOKEN=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	curl -s -X POST {{BASE}}/api/sub-tokens \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $TOKEN" \
		-d '{"name":"Test Token","nodes":["vless://abc-def@1.2.3.4:443?encryption=none#Tokyo"]}' | jq

# PUT /api/sub-tokens — update scoped token
test-update-token:
	#!/usr/bin/env bash
	SESS=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	# Get first scoped token
	SCOPED=$(curl -s {{BASE}}/api/sub-tokens -H "Authorization: Bearer $SESS" | jq -r '.tokens | keys[0]')
	if [ "$SCOPED" = "null" ]; then echo "No scoped tokens to update"; exit 0; fi
	curl -s -X PUT {{BASE}}/api/sub-tokens \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $SESS" \
		-d "{\"token\":\"$SCOPED\",\"name\":\"Renamed\"}" | jq

# DELETE /api/sub-tokens — delete scoped token
test-delete-token:
	#!/usr/bin/env bash
	SESS=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	SCOPED=$(curl -s {{BASE}}/api/sub-tokens -H "Authorization: Bearer $SESS" | jq -r '.tokens | keys[0]')
	if [ "$SCOPED" = "null" ]; then echo "No scoped tokens to delete"; exit 0; fi
	curl -s -X DELETE "{{BASE}}/api/sub-tokens?token=$SCOPED" \
		-H "Authorization: Bearer $SESS" | jq

# GET /sub — scoped token subscription
test-scoped-sub:
	#!/usr/bin/env bash
	SESS=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	SCOPED=$(curl -s {{BASE}}/api/sub-tokens -H "Authorization: Bearer $SESS" | jq -r '.tokens | keys[0]')
	if [ "$SCOPED" = "null" ]; then echo "No scoped tokens to test"; exit 0; fi
	curl -s "{{BASE}}/sub?token=$SCOPED"
# full integration test
test-full:
	#!/usr/bin/env bash
	set -e
	echo "=== Health check ==="
	curl -s {{BASE}}/api/ping | jq
	echo ""
	echo "=== Login ==="
	TOKEN=$(curl -s -X POST {{BASE}}/api/login \
		-H "Content-Type: application/json" \
		-d '{"password":"{{PW}}"}' | jq -r .token)
	echo "Token: $TOKEN"
	echo ""
	echo "=== Save nodes ==="
	curl -s -X PUT {{BASE}}/api/nodes \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $TOKEN" \
		-d '{"nodes":["vless://abc-def@1.2.3.4:443?encryption=none#Tokyo","vmess://YmFzZTY0"]}' | jq
	echo ""
	echo "=== List nodes ==="
	curl -s {{BASE}}/api/nodes -H "Authorization: Bearer $TOKEN" | jq
	echo ""
	echo "=== Sub URL ==="
	curl -s {{BASE}}/api/sub-url -H "Authorization: Bearer $TOKEN" | jq
	echo ""
	echo "=== Get subscription ==="
	curl -s "{{BASE}}/sub?token={{SUB}}"
	echo ""
	echo ""
	echo "=== Create scoped token ==="
	SCOPED=$(curl -s -X POST {{BASE}}/api/sub-tokens \
		-H "Content-Type: application/json" \
		-H "Authorization: Bearer $TOKEN" \
		-d '{"name":"Test","nodes":["vless://abc-def@1.2.3.4:443?encryption=none#Tokyo"]}' | jq -r .token)
	echo "Scoped token: $SCOPED"
	echo ""
	echo "=== List tokens ==="
	curl -s {{BASE}}/api/sub-tokens -H "Authorization: Bearer $TOKEN" | jq
	echo ""
	echo "=== Scoped sub (Tokyo node only) ==="
	curl -s "{{BASE}}/sub?token=$SCOPED"
	echo ""
	echo ""
	echo "=== Rotate token ==="
	NEW_TOKEN=$(curl -s -X PUT {{BASE}}/api/sub-token -H "Authorization: Bearer $TOKEN" | jq -r .token)
	echo "New token: $NEW_TOKEN"
	echo ""
	echo "=== Get subscription (new token) ==="
	curl -s "{{BASE}}/sub?token=$NEW_TOKEN"
	echo ""
	echo ""
	echo "=== Get subscription (old token) ==="
	STATUS=$(curl -s -o /dev/null -w "%{http_code}" "{{BASE}}/sub?token={{SUB}}")
	echo "Old token status: $STATUS (expect 401)"
	echo ""
	echo "=== Delete scoped token ==="
	curl -s -X DELETE "{{BASE}}/api/sub-tokens?token=$SCOPED" \
		-H "Authorization: Bearer $TOKEN" | jq
	echo ""
	echo "=== Logout ==="
	curl -s -X POST {{BASE}}/api/logout -H "Authorization: Bearer $TOKEN" | jq
	echo ""
	echo "Done."
