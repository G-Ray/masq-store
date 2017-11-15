BIN=node_modules/.bin

BFY=/usr/local/bin/

MOCHA_ARGS=	--compilers js:babel/register \
			--recursive

MOCHA_TARGET=src/__tests__

build:
	# $(BIN)/babel src --ignore __tests__ --out-dir dist
	browserify src/index.js -o dist/bundle.js
	# rm dist/index.js dist/hub.js

clean:
	rm -rf dist/*

test:
	NODE_ENV=test $(BIN)/mocha $(MOCHA_ARGS) $(MOCHA_TARGET)

test-watch:
	NODE_ENV=test $(BIN)/mocha $(MOCHA_ARGS) -w $(MOCHA_TARGET)

lint:
	$(BIN)/eslint src

PHONY: build clean test test-watch lint

