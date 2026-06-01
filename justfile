bundle_name := "openai-mcp.mcpb"
stage_dir   := "build-mcpb"

default:
    @just --list

install:
    npm install

build: install
    npm run build

run: install
    npm run dev

bundle: build
    rm -rf {{stage_dir}}
    mkdir -p {{stage_dir}}/server
    cp manifest.json {{stage_dir}}/manifest.json
    cp -r dist {{stage_dir}}/server/dist
    cp package.json package-lock.json {{stage_dir}}/server/
    cd {{stage_dir}}/server && npm ci --omit=dev --ignore-scripts
    npx --yes @anthropic-ai/mcpb pack {{stage_dir}} {{bundle_name}}
    rm -rf {{stage_dir}}
    @echo "\nBuilt {{bundle_name}} — double-click to install in Claude Desktop."

clean:
    rm -rf dist {{stage_dir}} {{bundle_name}}
