test:
	./node_modules/jasmine-node/bin/jasmine-node --matchall spec/

run:
	node index.js

deploy:
	./deploy.sh