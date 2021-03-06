PREFIX := HoneySens-Server
REVISION := 20.01.01
OUTDIR := out
# (watch|simple-watch|chokidar)
export DEV_WATCH_TASK := chokidar

dist: ${OUTDIR}/dist/${PREFIX}-${REVISION}.tar.gz

clean: ${OUTDIR}/dev/docker-compose
	${OUTDIR}/dev/docker-compose -f docker-compose-dev.yml -p honeysens_dev down -v
	docker rmi honeysens_dev_server:latest
	rm -rf ${OUTDIR}

dev: ${OUTDIR}/dev/docker-compose
	${OUTDIR}/dev/docker-compose -f docker-compose-dev.yml -p honeysens_dev up || true

${OUTDIR}/dev/docker-compose: | DIR.${OUTDIR}/dev
	curl -L "https://github.com/docker/compose/releases/download/1.22.0/docker-compose-$$(uname -s)-$$(uname -m)" -o $@
	chmod +x $@
	$@ --version

${OUTDIR}/dist/${PREFIX}-${REVISION}.tar.gz: ${OUTDIR}/build/${PREFIX}-${REVISION}/server-${REVISION}.tar ${OUTDIR}/build/${PREFIX}-${REVISION}/docker-compose.yml | DIR.${OUTDIR}/dist
	cp -v docs/INSTALL ${OUTDIR}/build/${PREFIX}-${REVISION}/
	tar -czf $@ -C ${OUTDIR}/build/ ${PREFIX}-${REVISION}/

${OUTDIR}/build/${PREFIX}-${REVISION}/server-${REVISION}.tar: ${OUTDIR}/web/data/config.cfg | DIR.${OUTDIR}/build/${PREFIX}-${REVISION}
	docker build -t honeysens/server:${REVISION} .
	docker save -o $@ honeysens/server:${REVISION}

${OUTDIR}/web/data/config.cfg: | DIR.$(OUTDIR)/web
	docker build -t honeysens/server-dev:${REVISION} -f Dockerfile.dev .
	docker run -v $(shell pwd):/mnt -v $(shell pwd)/${OUTDIR}/web:/srv -e BUILD_ONLY=1 --rm honeysens/server-dev:${REVISION} || true
	cp ${OUTDIR}/web/data/config.clean.cfg ${OUTDIR}/web/data/config.cfg

${OUTDIR}/build/${PREFIX}-${REVISION}/docker-compose.yml: | DIR.${OUTDIR}/build/${PREFIX}-${REVISION}
	sed 's/$$REVISION/${REVISION}/' docker-compose.yml > $@

DIR.${OUTDIR}/%:
	mkdir -p $(@:DIR.%=%)
