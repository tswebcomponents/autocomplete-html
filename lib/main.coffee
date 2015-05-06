completionProvider = require './provider'

module.exports =
  activate: ->
    #console.log('activate');

  getProvider: ->
    #console.log('getProvider');
    completionProvider

  # 2.0.0 API
  # providers - either a provider or a list of providers
  consumeProvider: (tsproviders, apiVersion='0.1.0') ->

    #console.log(providers);
    completionProvider.tsProvider = tsproviders[0]
    completionProvider.loadCompletions()

    #providers = [providers] if providers? and not Array.isArray(providers)
    #return unless providers?.length > 0
    #registrations = new CompositeDisposable
    #for provider in providers
    #     registrations.add @getAutocompleteManager().providerManager.registerProvider(provider, apiVersion)
    #registrations
