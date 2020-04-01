"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Type;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _objectSpread3 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

var _classCallCheck2 = _interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));

var _createClass2 = _interopRequireDefault(require("@babel/runtime/helpers/createClass"));

var _possibleConstructorReturn2 = _interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn"));

var _getPrototypeOf2 = _interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf"));

var _inherits2 = _interopRequireDefault(require("@babel/runtime/helpers/inherits"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _ethereumjsAbi = _interopRequireDefault(require("ethereumjs-abi"));

var _jsSha = require("js-sha3");

var _AbstractType2 = _interopRequireDefault(require("./AbstractType"));

var _verify = require("./verify");

var _primitives = require("./primitives");

/**
 * A factory function which returns a class representing an EIP712 Type
 * The returned Type can be instantiated and validated as an instance
 * of a particular type
 * 
 * There are two acceptable formats for the type definitions, a list of 
 * {
 *   name1: 'string',
 *   name2: 'string',
 * }
 * 
 * or 
 * 
 * [{
 *  name: 'name1',
 *  type: 'string'
 * }, {
 *  name: 'name2',
 *  type: 'string'
 * }]
 * 
 * @this    {Domain} The domain object to which the returned type should be associated * 
 * @param   {String}            name      A String to define the type 
 * @param   {Object|Object[]}   defs      The definition of the type's members and their types
 * @returns {Function} the constructor for the new StructureType
 */
function Type(primaryType, defs) {
  // Ensure that domain is defined
  var domain = this || {
    types: {}
  };
  if (!domain.types) domain.types = {}; // Process the type definition into an array of {name, type} pairs, 
  // keeping track of all dependent types 

  var properties = Array.isArray(defs) ? defs.map(function (_ref) {
    var name = _ref.name,
        type = _ref.type;
    return validateTypeDefinition({
      name: name,
      type: type
    }, domain);
  }) : Object.keys(defs).map(function (name) {
    return validateTypeDefinition({
      name: name,
      type: defs[name]
    }, domain);
  }); // Descend through the properties list to come up with a list of 
  // structure types that this type includes, sorted alphabetically

  var dependencies = findDependencies(properties, domain, []).sort();
  /**
   * @classdesc
   * This is the dynamically created class that represents a particular Struct type in
   * the EIP712 scheme.  This can be instantiated with particular values that match the
   * type's definition, and provides methods to encode the type in various formats, and 
   * sign it with a provided signer.
   */

  var StructureType =
  /*#__PURE__*/
  function (_AbstractType) {
    (0, _inherits2.default)(StructureType, _AbstractType);

    function StructureType(vals) {
      var _this;

      (0, _classCallCheck2.default)(this, StructureType);
      _this = (0, _possibleConstructorReturn2.default)(this, (0, _getPrototypeOf2.default)(StructureType).call(this));
      _this.name = primaryType;
      _this.properties = properties; // Save values for a type instance privately

      _this._object = {};
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        var _loop = function _loop() {
          var prop = _step.value;

          if (!(prop.name in vals)) {
            throw new Error("Type ".concat(_this.name, " missing required property ").concat(prop.name));
          } // Expose getters and setters for this.prop, validating on set


          Object.defineProperty((0, _assertThisInitialized2.default)((0, _assertThisInitialized2.default)(_this)), prop.name, {
            get: function get() {
              return _this._object[prop.name];
            },
            set: function set(val) {
              return _this._object[prop.name] = domain.validate(prop.type, val);
            }
          });
          _this._object[prop.name] = domain.validate(prop.type, vals[prop.name]);
        };

        for (var _iterator = properties[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          _loop();
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

      return _this;
    }
    /**
     * @override @static
     * Return the part of the type encoding that consists of the dependent types
     * i.e. the nested Structure types contained by this type.
     * @returns {String} A string encoding all types upon which this type depends
     */


    (0, _createClass2.default)(StructureType, [{
      key: "toObject",

      /**
       * @override
       * Return a bare object representation of this instance (as a new object)
       * 
       * @returns {Object} new object containing same key-value pairs of this instance
       */
      value: function toObject() {
        var _this2 = this;

        // Generate a new bare object, with each complex item decomposed into regular javascript objects and arrays
        return properties.reduce(function (obj, _ref2) {
          var name = _ref2.name,
              type = _ref2.type;
          return (0, _objectSpread3.default)({}, obj, (0, _defineProperty2.default)({}, name, domain.serialize(type, _this2._object[name])));
        }, {});
      }
      /**
       * Encode this object along with its type and domain as a full EIP712 
       * signature request, defining the types, domain, primaryType, and message
       * to be signed.  The output is suitable for use with web3.eth.signTypedData
       * @returns {Object} the signature request encoding of this instance
       */

    }, {
      key: "toSignatureRequest",
      value: function toSignatureRequest() {
        return {
          types: domain.toDomainDef(),
          domain: domain.toObject(),
          primaryType: this.name,
          message: this.toObject()
        };
      }
    }, {
      key: "encodeField",
      value: function encodeField(type, value) {
        var _this3 = this;

        if ((0, _primitives.isDynamicType)(type)) {
          return {
            type: 'bytes32',
            value: Buffer.from((0, _jsSha.keccak256)(value), 'hex')
          };
        } else if (type in domain.types) {
          // Structure Types are recursively encoded and hashed
          return {
            type: "bytes32",
            value: Buffer.from((0, _jsSha.keccak256)(value.encodeData()), 'hex')
          };
        } else if ((0, _primitives.isArrayType)(type)) {
          // Array types are the hash of their encoded members concatenated
          var innerType = type.slice(0, type.lastIndexOf('['));
          var encodedValues = value.map(function (item) {
            return _this3.encodeField(innerType, item);
          });
          return {
            type: 'bytes32',
            value: Buffer.from((0, _jsSha.keccak256)(_ethereumjsAbi.default.rawEncode(encodedValues.map(function (v) {
              return v.type;
            }), encodedValues.map(function (v) {
              return v.value;
            }))), 'hex')
          };
        } else if ((0, _primitives.isAtomicType)(type)) {
          return {
            type: type,
            value: value
          };
        } else {
          throw new Error("Unknown type: ".concat(type));
        }
      }
      /**
       * @override
       * Return the EIP712 data encoding of this instance, padding each member
       * to 32 bytes and hashing the result.  The ethereumjs-abi module provides
       * an encode() function which does most of the heavy lifting here, and the
       * structure of this function significantly inspired by the sample code
       * provided in the original EIP712 proposal.
       * @returns {String} the encoded data of this instance, ready for use with hashStruct
       */

    }, {
      key: "encodeData",
      value: function encodeData() {
        // Build parallel lists of types and values, to be passed to abi.encode
        var types = ['bytes32'];
        var values = [Buffer.from(this.constructor.typeHash(), 'hex')];
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = this.constructor.properties[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _ref4 = _step2.value;
            var type = _ref4.type,
                name = _ref4.name;

            var _this$encodeField = this.encodeField(type, this[name]),
                t = _this$encodeField.type,
                v = _this$encodeField.value;

            types.push(t);
            values.push(v);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        return _ethereumjsAbi.default.rawEncode(types, values);
      }
      /**
       * ABI encode this type according to the EIP712 spec. The encoding returned
       * is compatible with solidity, and ready to be hashed and signed.
       * @returns {String} The abi encoding of this instance, in an appropriate format to be hashed and signed
       */

    }, {
      key: "encode",
      value: function encode() {
        // \x19\x01 is the specified prefix for a typedData message
        return Buffer.concat([Buffer.from([0x19, 0x01]), domain.domainSeparator, this.hashStruct()]);
      }
      /**
       * Return the hash to be signed, simply the Keccak256 of the encoding
       * @returns {String} The hash, ready to be signed
       */

    }, {
      key: "signHash",
      value: function signHash() {
        return Buffer.from((0, _jsSha.keccak256)(this.encode()), 'hex');
      }
      /**
       * Sign the fully encoded version of the current instance with a provided
       * signer.  This is equivalent to the `web3.eth.signTypedData` function.
       * @param   {Object} signer The signer function, which takes a buffer and return a signature
       * @returns {String} the signed, encoded piece of data
       */

    }, {
      key: "sign",
      value: function sign(signer) {
        if (typeof signer !== 'function') {
          throw new Error('Must provide a signer function');
        }

        return signer(this.signHash());
      }
      /**
       * Verify a signature made by an address over this object
       * @param   {Object}  signature
       * @param   {String}  address
       * @returns {Boolean} whether the given signature is valid over this object
       */

    }, {
      key: "verifySignature",
      value: function verifySignature(signature, address) {
        var hash = this.signHash();
        return (0, _verify.verifyRawSignatureFromAddress)(hash, signature, address);
      }
    }], [{
      key: "encodeDependentTypes",
      value: function encodeDependentTypes() {
        return this.dependencies.map(function (t) {
          return domain.types[t].encodeTypeFragment();
        });
      }
    }]);
    return StructureType;
  }(_AbstractType2.default); // Save the new StructureType to the domain


  (0, _defineProperty2.default)(StructureType, "name", primaryType);
  (0, _defineProperty2.default)(StructureType, "properties", properties);
  (0, _defineProperty2.default)(StructureType, "dependencies", dependencies);
  domain.types[primaryType] = StructureType;
  return StructureType;
}
/**
 * Check the validity of a particular name/type pair within a given domain,
 * and return an object containing the name and type.
 * 
 * @param {Object} item   the item being validated, must contain `name` and `type` keys
 * @param {Object} domain the domain in which the item should be validated
 */


function validateTypeDefinition(_ref5, domain) {
  var name = _ref5.name,
      type = _ref5.type;

  if (!name || !type) {
    throw new Error('Invalid type definition: all entries must specify name and type');
  }

  if ((0, _typeof2.default)(type) === 'object') {
    // TODO: Allow recursive type defintions?
    throw new Error('Nested type definitions not supported');
  } else if ((0, _primitives.isArrayType)(type)) {
    var primitiveType = type.substring(0, type.lastIndexOf("["));

    if (!primitiveType in domain.types) {
      throw new Error("Type ".concat(primitiveType, " is undefined in this domain"));
    }
  } else if (!(0, _primitives.isPrimitiveType)(type) && !(type in domain.types)) {
    // Refuse undefined, non-primitive types
    throw new Error("Type ".concat(type, " is undefined in this domain"));
  }

  return {
    name: name,
    type: type
  };
}
/**
 * Recursively search a list of properties to uncover a list of all dependent types
 * Each non-primitive type delegates to the dependencies of that type
 * 
 * @param {Object[]}      props  The properties of a particular
 * @param {Object|Domain} domain The domain object in which the dependencies are being resolved
 * @param {String[]}      found  A list of structure type names found so far
 */


function findDependencies(props, domain) {
  var found = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = props[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var _ref7 = _step3.value;
      var type = _ref7.type;
      if ((0, _primitives.isPrimitiveType)(type)) continue;
      var dependentTypeName = type;

      if ((0, _primitives.isArrayType)(type)) {
        dependentTypeName = type.substring(0, type.lastIndexOf("["));
      } // Merge the found array with new dependencies of 


      found = found.concat([dependentTypeName].concat((0, _toConsumableArray2.default)(findDependencies(domain.types[dependentTypeName].properties, domain, found))).filter(function (t) {
        return !found.includes(t);
      }));
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return != null) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }

  return found;
}