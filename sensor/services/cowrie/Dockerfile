ARG ARCH=amd64
FROM multiarch/alpine:${ARCH}-v3.9

COPY prepare.sh run.sh dont_daemonize.patch honeysens.py cowrie.cfg /root/
RUN /bin/sh /root/prepare.sh

USER cowrie
CMD ["/opt/run.sh"]