SRC_FILES := $(shell find src -name '*.ts')

lib: ${SRC_FILES} package.json tsconfig.json node_modules rollup.config.js
	@./node_modules/.bin/rollup -c && touch lib

.PHONY: test
test: node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' \
		./node_modules/.bin/mocha -u tdd -r ts-node/register --extension ts test/*.ts --grep '$(grep)' --exit --timeout 15000

.PHONY: coverage
coverage: node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' nyc --reporter=html mocha -u tdd -r ts-node/register --extension ts test/*.ts -R nyan && open coverage/index.html

.PHONY: lint
lint: node_modules
	@./node_modules/.bin/eslint src --ext .ts --fix

.PHONY: ci-test
ci-test: node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' ./node_modules/.bin/nyc --reporter=text \
		./node_modules/.bin/mocha -u tdd -r ts-node/register --extension ts test/*.ts -R list

.PHONY: ci-lint
ci-lint: node_modules
	@./node_modules/.bin/eslint src --ext .ts --max-warnings 0 --format unix && echo "Ok"

node_modules:
	yarn install --non-interactive --frozen-lockfile --ignore-scripts

.PHONY: clean
clean:
	rm -rf lib/ coverage/

.PHONY: distclean
distclean: clean
	rm -rf node_modules/
