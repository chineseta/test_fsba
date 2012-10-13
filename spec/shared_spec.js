describe('shared code', function () {
  var shared = require('../public/js/shared');

  describe('.formErrors', function () {
    it('should validate iata', function () {
      expect(shared.formErrors().iata).toEqual(jasmine.any(String));
      expect(shared.formErrors({iata: 'invalid'}).iata).toEqual(jasmine.any(String));
      expect(shared.formErrors({iata: 'JFK'}).iata).toBeUndefined();
    });

    it('should validate type', function () {
      expect(shared.formErrors().type).toEqual(jasmine.any(String));
      expect(shared.formErrors({type: 'invalid'}).type).toEqual(jasmine.any(String));
      expect(shared.formErrors({type: 'dep'}).type).toBeUndefined();
      expect(shared.formErrors({type: 'arr'}).type).toBeUndefined();
    });

    it('should validate airline', function () {
      expect(shared.formErrors().airline).toEqual(jasmine.any(String));
      expect(shared.formErrors({airline: ''}).airline).toBeUndefined();
      expect(shared.formErrors({airline: 'invalid'}).airline).toEqual(jasmine.any(String));
      expect(shared.formErrors({airline: 'AA'}).airline).toBeUndefined();
    });

    it('should validate all fields', function () {
      expect(shared.formErrors()).not.toBeUndefined();
      expect(shared.formErrors({})).not.toBeUndefined();
      expect(shared.formErrors({iata: 'KBP', type: 'arr', airline: 'B6'})).toBeUndefined();
    });
  });

  describe('.reindex', function () {
    it('should work with an empty field', function () {
      expect(shared.reindex(undefined, 'name')).toEqual({});
      expect(shared.reindex([], 'name')).toEqual({});
    });

    it('should reindex an array of objects', function () {
      var array = [{key: 'key 1', field: 'field 1'}, {key: 'key 2', field: 'field 2'}];

      expect(shared.reindex(array, 'key')).toEqual({
        'key 1': {key: 'key 1', field: 'field 1'},
        'key 2': {key: 'key 2', field: 'field 2'}
      });

      expect(shared.reindex(array, 'key', 'field')).toEqual({
        'key 1': 'field 1', 'key 2': 'field 2'
      });
    });
  });
});