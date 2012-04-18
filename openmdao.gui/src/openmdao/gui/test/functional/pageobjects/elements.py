"""
Element descriptors and underlying object types which are intended to be used
with BasePageObject.
"""

from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import NoSuchElementException, \
                                       ElementNotVisibleException

class _BaseElement(object):
    """
    Base for element objects, retains browser driver (from `page`) and locator.

    page: :class:`BasePageObject`
        Page object containing ``browser`` attribute.

    locator: tuple
        WebDriver locator used to find this element in `page`.
    """

    def __init__(self, page, locator):
        self._browser = page.browser
        self._locator = locator

    @property
    def element(self):
        """ The element on the page. """
        return WebDriverWait(self._browser, 10).until(
                   lambda browser: browser.find_element(*self._locator))

    def is_present(self):
        """ Return True if the element can be found. """
        try:
            found = self.element
            return True
        except NoSuchElementException:
            return False

    def is_visible(self):
        """ Return True if the element is displayed. """
        try:
            return self.element.is_displayed()
        except (NoSuchElementException, ElementNotVisibleException):
            return False


class _ButtonElement(_BaseElement):
    """ Basically something to ``click``. """

    def __init__(self, page, locator):
        super(_ButtonElement, self).__init__(page, locator)

    @property
    def value(self):
        """ The element's ``value`` attribute. """
        return self.element.get_attribute('value')

    def click(self):
        """ 'Click' on the button. """
        element = self.element
        WebDriverWait(self._browser, 10).until(
            lambda browser: element.is_displayed())
        element.click()


class _CheckboxElement(_BaseElement):
    """ The `value` of this is the selection state. """

    def __init__(self, page, locator):
        super(_CheckboxElement, self).__init__(page, locator)

    @property
    def value(self):
        """ The element's selection state. """
        return self.element.is_selected()

    @value.setter
    def value(self, new_value):
        element = self.element
        if bool(new_value) != element.is_selected():
            element.click()  # Toggle it.


class _InputElement(_BaseElement):
    """ A text input field. """

    def __init__(self, page, locator):
        super(_InputElement, self).__init__(page, locator)

    @property
    def value(self):
        """ The element's text input value. """
        return self.element.get_attribute('value')

    @value.setter
    def value(self, new_value):
        element = self.element
        WebDriverWait(self._browser, 10).until(
            lambda browser: element.is_enabled())
        if element.get_attribute('value'):
            value = element.get_attribute('value')
            element.clear()
        element.send_keys(new_value)


class _TextElement(_BaseElement):
    """ Just some text on the page. """

    def __init__(self, page, locator):
        super(_TextElement, self).__init__(page, locator)

    @property
    def value(self):
        """ The element's text. """
        return self.element.text


class BaseElement(object):
    """
    Implements the Python descriptor protocol in combination with
    :class:`BasePageObject`.

    cls: :class:`_BaseElement`
        The type of element to create.

    locator: tuple
        WebDriver locator for the element.
    """

    def __init__(self, cls, locator):
        self._cls = cls
        self._locator = locator
        self._elements = {}

    def __get__(self, page, cls):
        """ Return the element's value. """
        if page is None:
            return self
        element = self.get(page)
        return element.value

    def __set__(self, page, value):
        """ Set the element's value to `value`. """
        element = self.get(page)
        element.value = value

    def get(self, page):
        """ Return element instance for `page`. """
        element = self._elements.get(page)
        if element is None:
            element = self._cls(page, self._locator)
            self._elements[page] = element
        return element


class ButtonElement(BaseElement):
    """ Basically something to ``click``. """
    def __init__(self, locator):
        super(ButtonElement, self).__init__(_ButtonElement, locator)

class CheckboxElement(BaseElement):
    """ The `value` of this is the selection state. """
    def __init__(self, locator):
        super(CheckboxElement, self).__init__(_CheckboxElement, locator)

class InputElement(BaseElement):
    """ A text input field. """
    def __init__(self, locator):
        super(InputElement, self).__init__(_InputElement, locator)

class TextElement(BaseElement):
    """ Just some text on the page. """
    def __init__(self, locator):
        super(TextElement, self).__init__(_TextElement, locator)

