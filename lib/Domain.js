"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EIP712Domain;
exports.EIP712DomainProperties = void 0;

var _objectSpread4 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _ethereumjsAbi = _interopRequireDefault(require("ethereumjs-abi"));

var _jsSha = require("js-sha3");

var _AbstractType2 = _interopRequireDefault(require("./AbstractType"));

var _Type = _interopRequireDefault(require("./Type"));

var _primitives = require("./primitives");

// The set of properties that a EIP712Domain MAY implement
var EIP712DomainProperties = [{
  name: "name",
  type: "string"
}, {
  name: "version",
  type: "string"
}, {
  name: "chainId",
  type: "uint256"
}, {
  name: "verifyingContract",
  type: "address"
}, {
  name: "salt",
  type: "bytes32"
}];
/**
 * A constructor/factory function which constructs EIP712 Domains as types,
 * then returns a new instance of the domain. Since an instantiated EIP712 
 * Domain needs to share many static methods with the types it contains
 * (e.g. encodeType, typeHash), but does not require that all properties
 * are present in a given instance, we define a new prototype for each Domain
 * which specifies the provided properties as its type definition, and then
 * instantiates that prototype with the provided values.
 * @param   {Object} def   The definition of the EIP712 domain
 * @returns {Object}       An instantiated EIP712Domain type with the specified properties
 */

exports.EIP712DomainProperties = EIP712DomainProperties;

function EIP712Domain(def) {
  var vals = {}; // Extract the EIP712 domain properties that were provided

  var properties = EIP712DomainProperties.reduce(function (props, _ref) {
    var name = _ref.name,
        type = _ref.type;
    // Skip unused EIP712 types
    if (!(name in def)) return props; // Validate primitive types

    vals[name] = _primitives.validate[type](def[name]); // Include property in type definition

    return (0, _toConsumableArray2.default)(props).concat([{
      name: name,
      type: type
    }]);
  }, []); // Throw an error if extra properties were provided

  if (Object.keys(vals).length !== Object.keys(def).length) {
    throw new Error('Extra key in EIP712Domain definition');
  } else if (Object.keys(def).length === 0) {
    throw new Error('Must supply at least one EIP712Domain property');
  }
  /**
   * @classdesc
   * A domain is a scope in which we can define multiple Types which can
   * reference each other. A domain behaves similarly to a Type, with the 
   * primary difference that it also includes a set of types that can 
   * reference each other within it.  The primary method of a 
   * domain is `createType()` which will return a new constructor
   * for a type that lives within this domain.
   */


  var Domain =
  /*#__PURE__*/
  function (_AbstractType) {
    (0, _inherits2.default)(Domain, _AbstractType);

    function Domain(vals) {
      var _this;

      (0, _classCallCheck2.default)(this, Domain);
      _this = (0, _possibleConstructorReturn2.default)(this, (0, _getPrototypeOf2.default)(Domain).call(this));
      _this.vals = (0, _objectSpread4.default)({}, vals); // The types object maps String names to the type prototypes that exist
      // within this domain.  Prototypes are appendended to this.types for every
      // call to this.createType()

      _this.types = {}; // Precompute the domainSeparator for use with signing types in this domain

      _this.domainSeparator = _this.hashStruct();
      /**
       * Construct a new type that will be associated with this domain
       * @returns {Function}  the constructor for the new type class
       */

      _this.createType = _Type.default.bind((0, _assertThisInitialized2.default)((0, _assertThisInitialized2.default)(_this)));
      return _this;
    }
    /**
     * Validate that a particular object conforms to a valid type definition in this domain, 
     * and return a standardized version of input value.  In particular, structure types will
     * be coerced to an instance of the corresponding structure class, array types will validate
     * each item according to the base type of the array, and primitive types will be validated
     * by the appropriate validator in `validatePrimitive`
     *
     * @param   {String}  type  the string name of the type of the value being validated
     * @param   {Any}     val   the candidate value of the type to be validated/standardized
     * @returns {Any}           the standardized/validated representation of this
     * 
     * @throws  {Error} if the input is an invalid instance of the given type
     */


    (0, _createClass2.default)(Domain, [{
      key: "validate",
      value: function validate(type, val) {
        var _this2 = this;

        if ((0, _primitives.isArrayType)(type)) {
          // Apply the validator to each item in an array, using the base type
          return val.map(function (item) {
            return _this2.validate((0, _primitives.getElementaryType)(type), item);
          });
        } else if ((0, _primitives.isPrimitiveType)(type)) {
          return _primitives.validate[type](val);
        } else if (type in this.types) {
          var StructType = this.types[type];
          return val instanceof StructType ? val : new StructType(val);
        } else {
          throw new Error("Type ".concat(type, " not recognized in this domain"));
        }
      }
      /**
       * Recursively expand an object containing instances of structure type classes,
       * and return a bare javascript object with the same hierarchical structure
       * Conceptually the opposite of @see this.validate
       * @param   {String}  type the string name of the type of value being serialized
       * @param   {Any}     val  the type instance or primitive literal being serialized
       * @returns {Object}
       * @throws  {Error}
       */

    }, {
      key: "serialize",
      value: function serialize(type, val) {
        var _this3 = this;

        if (type in this.types) {
          // Recursively expand nested structure types
          return val.toObject();
        } else if ((0, _primitives.isArrayType)(type)) {
          // Map serializer to array types
          return val.map(function (item) {
            return _this3.serialize((0, _primitives.getElementaryType)(type), item);
          });
        } else if ((0, _primitives.isPrimitiveType)(type)) {
          return val;
        } else {
          throw new Error("Type ".concat(type, " is not a valid type in this domain"));
        }
      }
      /**
       * Return an object mapping the names of types contained by this domain
       * to their list-style type definitions
       * @returns {Object}  Mapping from type name -> type definition
       */

    }, {
      key: "listTypes",
      value: function listTypes() {
        var _this4 = this;

        return Object.keys(this.types).reduce(function (obj, t) {
          return (0, _objectSpread4.default)({}, obj, (0, _defineProperty2.default)({}, t, _this4.types[t].typeDef()));
        }, {});
      }
      /**
       * Concatenate the type definition for this domain, with 
       * the definition of all the types that it contains
       * @returns {Object} 
       */

    }, {
      key: "toDomainDef",
      value: function toDomainDef() {
        return (0, _objectSpread4.default)((0, _defineProperty2.default)({}, this.constructor.name, this.constructor.typeDef()), this.listTypes());
      }
      /**
       * @override
       * A simplified encodeData function that only needs to handle string
       * and atomic types.  Still defers to abi.rawEncode.
       * @returns {String} encoding of the definition of this Domain
       */

    }, {
      key: "encodeData",
      value: function encodeData() {
        var _this5 = this;

        var types = this.constructor.properties.map(function (_ref2) {
          var type = _ref2.type;
          return type === 'string' ? 'bytes32' : type;
        });
        var values = this.constructor.properties.map(function (_ref3) {
          var name = _ref3.name,
              type = _ref3.type;
          return type === 'string' ? Buffer.from((0, _jsSha.keccak256)(_this5.vals[name]), 'hex') : _this5.vals[name];
        });
        return _ethereumjsAbi.default.rawEncode(['bytes32'].concat((0, _toConsumableArray2.default)(types)), [Buffer.from(this.constructor.typeHash(), 'hex')].concat((0, _toConsumableArray2.default)(values)));
      }
      /**
       * @override
       */

    }, {
      key: "toObject",
      value: function toObject() {
        return (0, _objectSpread4.default)({}, this.vals);
      }
    }]);
    return Domain;
  }(_AbstractType2.default);

  (0, _defineProperty2.default)(Domain, "name", 'EIP712Domain');
  (0, _defineProperty2.default)(Domain, "properties", properties);
  (0, _defineProperty2.default)(Domain, "dependencies", []);
  return new Domain(vals);
}
/**
 * Create a message object and domain from a raw signature request object. 
 * @param   {Object} request An object representing a signature request
 * @returns {Object} the constructed {domain} and {message} instances
 * @throws  {Error} if signature request contains cyclic dependencies
 */


EIP712Domain.fromSignatureRequest = function fromSignatureRequest(request) {
  var types = request.types,
      rawMessage = request.message,
      primaryType = request.primaryType,
      rawDomain = request.domain; // Create the domain instance

  var domain = new EIP712Domain(rawDomain); // Perform a (reverse) topological sort for dependency resolution, keeping track of depth first search postorder 

  var postorder = []; // Keep track of already visited types, as well as potential cycles

  var marked = new Set(),
      cyclecheck = new Set(); // Define recursive depth-first search with cycle detection

  var dfs = function dfs(type) {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = types[type][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var _ref5 = _step.value;
        var subtype = _ref5.type;
        if (marked.has(subtype) || (0, _primitives.isNotStructureType)(subtype)) continue;

        if ((0, _primitives.isArrayType)(subtype)) {
          subtype = subtype.substring(0, subtype.indexOf("["));
        }

        if (cyclecheck.has(subtype)) {
          throw new Error('Cannot construct domain from signature request with cyclic dependencies');
        }

        cyclecheck.add(subtype);
        dfs(subtype);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return != null) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    postorder.push(type);
    marked.add(type);
  }; // Perform the search


  var _arr = Object.keys(types);

  for (var _i = 0; _i < _arr.length; _i++) {
    var type = _arr[_i];

    if (type !== 'EIP712Domain' && !marked.has(type)) {
      dfs(type);
    }
  } // Create all necessary structure types in this domain
  // Iterate in postorder to guarantee dependencies are satisfied


  for (var _i2 = 0; _i2 < postorder.length; _i2++) {
    var name = postorder[_i2];

    if (name !== 'EIP712Domain') {
      domain.createType(name, types[name]);
    }
  } // Create the message instance


  var MessageType = domain.types[primaryType];
  var message = new MessageType(rawMessage);
  return {
    domain: domain,
    message: message
  };
};