PREFIX := HoneySens-Firmware-dockerx86
REVISION := 20.01.01
OUTDIR := out
METADATA := metadata.xml
# (watch|simple-watch|chokidar)
export DEV_WATCH_TASK := chokidar

dist: ${OUTDIR}/dist/${PREFIX}-${REVISION}.tar.gz

clean: ${OUTDIR}/utils/docker-compose
	${OUTDIR}/utils/docker-compose -f docker-compose-dev.yml -p sensor_dev down -v
	docker rmi sensor_dev_sensor:latest || true
	rm -rf ${OUTDIR}

dev: ${OUTDIR}/utils/docker-compose
	${OUTDIR}/utils/docker-compose -f docker-compose-dev.yml -p sensor_dev up || true

${OUTDIR}/utils/docker-compose: | DIR.${OUTDIR}/utils
	curl -L "https://github.com/docker/compose/releases/download/1.22.0/docker-compose-$$(uname -s)-$$(uname -m)" -o $@
	chmod +x $@
	$@ --version

${OUTDIR}/dist/${PREFIX}-${REVISION}.tar.gz: ${OUTDIR}/build/firmware.img ${OUTDIR}/build/metadata.xml ${OUTDIR}/build/docker-compose.yml | DIR.${OUTDIR}/dist
	mkdir -p ${OUTDIR}/build/conf
	cp -v .env Readme.md ${OUTDIR}/build/
	tar -czf $@ -C ${OUTDIR}/build/ firmware.img metadata.xml docker-compose.yml conf/ .env Readme.md

${OUTDIR}/build/firmware.img: | DIR.${OUTDIR}/build
	docker build --build-arg REVISION=${REVISION} -t honeysens/sensorx86:${REVISION} -f Dockerfile ../../
	docker save -o $@ honeysens/sensorx86:${REVISION}

${OUTDIR}/build/metadata.xml: | DIR.${OUTDIR}/build
	sed 's/$$REVISION/${REVISION}/' metadata.xml > $@

${OUTDIR}/build/docker-compose.yml: | DIR.${OUTDIR}/build
	sed 's/$$REVISION/${REVISION}/' docker-compose.yml > $@

DIR.${OUTDIR}/%:
	mkdir -p $(@:DIR.%=%)
