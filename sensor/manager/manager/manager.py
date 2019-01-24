#!/usr/bin/env python2

from __future__ import absolute_import

import argparse
import ConfigParser
import netifaces
import os
import shutil
import signal
import sys
import tarfile
import tempfile
import threading
import time
import zmq

from . import collector
from . import commands
from . import config_updater
from . import event_processor
from . import hooks
from . import polling
from . import services
from . import state
from .platforms import dummy, bbb, docker
from .utils import constants

manager = None


class Manager:

    config_archive = None
    config = ConfigParser.ConfigParser()
    config_dir = None
    interface = None
    platform = None
    zmq_context = zmq.Context()
    events = {}
    events_lock = threading.Lock()

    def __init__(self, config_archive, interface, platform):
        self.config_archive = config_archive
        self.init_config()
        self.init_interface(interface)
        self.platform = platform  # Temporarily save the name of the requested platform here, after start() the instance

    def init_config(self):
        if not os.path.isfile(self.config_archive):
            print('Error: Could not open configuration archive {}'.format(self.config_archive))
            exit()
        # Unpack and parse
        try:
            self.config_dir = tempfile.mkdtemp()
            with tarfile.open(self.config_archive) as config_archive:
                config_archive.extractall(self.config_dir)
            self.config.readfp(open('{}/honeysens.cfg'.format(self.config_dir)))
        except Exception as e:
            print('Error: Could not parse configuration ({})'.format(str(e)))
        # Create config symlink for 3rd parties
        if os.path.islink(constants.CFG_SYMLINK):
            os.remove(constants.CFG_SYMLINK)
        os.symlink('{}/honeysens.cfg'.format(self.config_dir), constants.CFG_SYMLINK)
        # Performing configuration update if required
        config_updater.update(self.config_archive, self.config_dir, self.config)
        print('Configuration from {} initialized'.format(self.config_archive))

    def init_interface(self, interface):
        # Fall back to default interface in case none was provided
        if interface is None:
            self.interface = constants.DEFAULT_IFACE
        else:
            self.interface = interface
        # Ensure interface existence
        print('PLATFORM: Waiting for {} to become available...'.format(self.interface))
        while not self.interface_available():
            time.sleep(1)

    def init_platform(self):
        if self.platform == 'bbb':
            self.platform = bbb.Platform(hooks, self.interface, self.config_dir, self.config_archive)
        elif self.platform == 'docker':
            self.platform = docker.Platform(hooks, self.interface, self.config_dir, self.config_archive)
        else:
            self.platform = dummy.Platform(hooks, self.interface, self.config_dir, self.config_archive)

    def start(self):
        self.init_platform()
        services.init(self.config_dir, self.config, hooks, self.platform, self.interface)
        hooks.execute_hook(constants.Hooks.ON_INIT)
        # Apply initial configuration
        print('Applying initial configuration')
        state.apply_config(self.config, {}, True)
        # Polling
        polling.start(self.config_dir, self.config, self.config_archive, self.interface, self.platform)
        event_processor.start(self.config_dir, self.config, self.events, self.events_lock)
        collector.start(self.zmq_context, self.events, self.events_lock)
        print('===============================================================')
        print('Manager: Startup sequence completed, launching command endpoint')
        print('===============================================================')
        commands.start(self.zmq_context)

    def cleanup(self):
        # Stop threads
        shutil.rmtree(self.config_dir)

    def interface_available(self):
        return self.interface in netifaces.interfaces()


def sigint_handler(signal, frame):
    print('Received SIGINT, performing graceful shutdown')
    manager.cleanup()
    sys.exit(0)


def main():
    global manager
    parser = argparse.ArgumentParser()
    parser.add_argument('config', help='Sensor configuration archive')
    parser.add_argument('-i', '--interface', help='Network interface to use')
    parser.add_argument('-p', '--platform', help='Platform module')
    args = parser.parse_args()
    # Register SIGINT handler
    signal.signal(signal.SIGINT, sigint_handler)
    manager = Manager(args.config, args.interface, args.platform)
    manager.start()


if __name__ == '__main__':
    main()