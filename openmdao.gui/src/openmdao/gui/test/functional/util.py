"""
Utilities for GUI functional testing.
"""

import inspect
import logging
import socket
import sys
import time

from distutils.spawn import find_executable
from multiprocessing import Process
from nose.tools import eq_ as eq
from pyvirtualdisplay import Display
from selenium import webdriver

from openmdao.gui.omg import AppServer, run
from openmdao.util.network import get_unused_ip_port

from pageobjects.project import ProjectsListPage

if '.' not in sys.path:  # Look like an interactive session.
    sys.path.append('.')

TEST_CONFIG = dict(browsers=[], server=None, port=None)
_display = None


def setup_chrome():
    """ Initialize the 'chrome' browser. """
    path = find_executable('chromedriver')
    driver = webdriver.Chrome(executable_path=path)
    driver.implicitly_wait(15)
    TEST_CONFIG['browsers'].append(driver)
    return driver

def setup_firefox():
    """ Initialize the 'firefox' browser. """
    profile = webdriver.FirefoxProfile()
    profile.native_events_enabled = True
    driver = webdriver.Firefox(profile)
    driver.implicitly_wait(15)
    TEST_CONFIG['browsers'].append(driver)
    return driver

_browsers_to_test = dict(
    #Chrome=setup_chrome,
    Firefox=setup_firefox,
)


def setup_server(virtual_display=True):
    """ Start server on ``localhost`` using an unused port. """
    port = get_unused_ip_port()
    TEST_CONFIG['port'] = port
    server = Process(target=_run)
    TEST_CONFIG['server'] = server
    server.start()

    for i in range(100):
        time.sleep(.1)
        try:
            sock = socket.create_connection(('localhost', port))
        except socket.error as exc:
            if 'Connection refused' not in str(exc):
                raise RuntimeError('connect failed: %r' % exc)
        else:
            sock.close()
            break
    else:
        raise RuntimeError('Timeout trying to connect to localhost:%d' % port)

# FIXME: this has no effect when running under nose (firefox on hx).
    if virtual_display:
        global _display
#        _display = Display(visible=0, size=(800, 600))
        _display = Display(backend='xvfb')
        _display.start()

def _run():
    """ Starts GUI server. """
    parser = AppServer.get_argument_parser()
    options, args = parser.parse_known_args(('--server', '--port',
                                             str(TEST_CONFIG['port'])))
    run(options=options)

def teardown_server():
    '''The function gets called once after all of the
    tests are called'''
    for browser in TEST_CONFIG['browsers']:
        browser.close()
    if _display is not None:
        _display.stop()
    TEST_CONFIG['server'].terminate()


def generate(modname):
    """ Generates tests for all configured browsers for `modname`. """
    module = sys.modules[modname]
    functions = inspect.getmembers(module, inspect.isfunction)
    tests = [func for name, func in functions if name.startswith('_test_')]
    for name in sorted(_browsers_to_test.keys()):
        try:
            browser = _browsers_to_test[name]()
            browser.title
        except Exception as exc:
            logging.critical('Skipping %s, caught: %s', name, exc)
        else:
            for _test in tests:
                logging.critical('running %s using %s', _test, name)
                yield _test, browser
        browser.close()
        TEST_CONFIG['browsers'].remove(browser)


def begin(browser):
    """ Start in projects page. Returns that page. """
    projects_page = ProjectsListPage(browser, TEST_CONFIG['port'])
    projects_page.go_to()
    eq( "Projects", projects_page.page_title )
    return projects_page


def new_project(new_project_page):
    """
    Creates a randomly-named new project.
    Returns ``(info_page, info_dict)``
    """
    assert new_project_page.page_title.startswith('Project: New Project')

    data = dict(name=new_project_page.get_random_project_name(),
                description='Just a project generated by a test script',
                version='12345678', shared=True)

    project_info_page = \
        new_project_page.create_project(data['name'], data['description'],
                                        data['version'], data['shared'])
    eq( 'Project: '+data['name'], project_info_page.page_title )

    return (project_info_page, data)

