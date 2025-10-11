import { expect } from 'jest';
import MyModule from './MyModule';

describe('MyModule', () => {
  let myModule: MyModule;

  beforeEach(() => {
    myModule = new MyModule();
  });

  describe('public methods', () => {
    it('should return the expected value for a public method', async () => {
      const result = await myModule.publicMethod();
      expect(result).toBe(expectedValue);
    });
  });

  describe('private methods', () => {
    it('should call the private method correctly', async () => {
      jest.spyOn(myModule, 'privateMethod').mockImplementation(() => expectedValue);

      const result = await myModule.publicMethod();

      expect(myModule.privateMethod).toHaveBeenCalled();
      expect(result).toBe(expectedValue);
    });
  });

  describe('static methods', () => {
    it('should return the expected value for a static method', async () => {
      const result = MyModule.staticMethod();
      expect(result).toBe(expectedValue);
    });
  });

  describe('deletee properties', () => {
    it('should delete the property correctly', async () => {
      myModule.deleteeProperty = 'value';
      expect(myModule.deleteeProperty).toBe('value');

      delete myModule.deleteeProperty;
      expect('deleteeProperty' in myModule).toBe(false);
    });
  });

  describe('static properties', () => {
    it('should return the expected value for a static property', async () => {
      const result = MyModule.staticProperty;
      expect(result).toBe(expectedValue);
    });
  });
});
