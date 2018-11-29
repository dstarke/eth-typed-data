const util = require('ethereumjs-util')
// Example tests
const { EIP712Domain } = require('..')

describe('MailExample', () => {
  // The provided example from the EIP712 PR
  const MailExample = require('./data/Mail.json')
  const { 
    Person: personDef, 
    Mail: mailDef, 
  } = MailExample.request.types
  const {
    encodeType, typeHash, encodeData, hashStruct, signHash
  } = MailExample.results.Mail

  let Domain, Person, Mail, message
  beforeAll(() => {
    // Build domain
    Domain = new EIP712Domain(MailExample.request.domain)
    // Build type constructors
    Person = Domain.createType('Person', personDef)
    Mail = Domain.createType('Mail', mailDef)
    // Build an instance of mail to test
    message = new Mail(MailExample.request.message)
  })

  test('domainSeparator', () => {
    expect(util.bufferToHex(Domain.domainSeparator)).toEqual(MailExample.results.domainSeparator)
  })

  test('toSignatureRequest', () => {
    expect(message.toSignatureRequest()).toEqual(MailExample.request)
  })

  test('toObject', () => {
    expect(message.toObject()).toEqual(MailExample.request.message)
  })

  test('encodeType', () => {
    expect(Mail.encodeType()).toEqual(encodeType)
  })

  test('typeHash', () => {
    expect(util.bufferToHex(Mail.typeHash())).toEqual(typeHash)
  })

  test('encodeData', () => {
    expect(util.bufferToHex(message.encodeData())).toEqual(encodeData)
  })

  test('hashStruct', () => {
    expect(util.bufferToHex(message.hashStruct())).toEqual(hashStruct)
  })

  test('signHash', () => {
    expect(util.bufferToHex(message.signHash())).toEqual(signHash)
  })
})

// Add more examples with different data structures here:
// TODO