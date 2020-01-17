#!/usr/bin/env python2

from __future__ import absolute_import

import argparse
import zmq

from .utils import constants


def main():
    context = zmq.Context()
    parser = argparse.ArgumentParser()
    parser.add_argument('-l', '--log-level', choices=['debug', 'info', 'warning'], help='Switch to logging level')
    parser.add_argument('-s', '--shutdown', action='store_true', help='Cleanly shut the manager down (as with SIGTERM)')
    args = parser.parse_args()

    print('Connecting to socket {}'.format(constants.CMD_SOCKET))
    socket = context.socket(zmq.REQ)
    socket.connect(constants.CMD_SOCKET)

    if args.log_level:
        socket.send_json({'cmd': 'log_level', 'level': args.log_level})
    elif args.shutdown:
        socket.send_json({'cmd': 'shutdown'})
    else:
        socket.send_json({'cmd': 'status'})

    response = socket.recv_json()
    print(response['args'])


if __name__ == '__main__':
    main()
