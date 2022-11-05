App = {
  web3Provider: null,
  contracts: {},
  names: new Array(),
  url: 'http://127.0.0.1:7545',
  chairPerson:null,
  currentAccount:null,
  init: function() {

    fetch('http://localhost:3000/campaigns/open')
    .then(resp => resp.json())
    .then(data => {
      console.log(data);  
      var campaignRows = $('#campaignRows');
      var campaignCard = $('#campaignCard');

      for (i = 0; i < data.length; i ++) {
        campaignCard.find('.card-title').text(data[i].title);
        campaignCard.find('.card-description').text(data[i].description);
        campaignCard.find('.btn-donate').attr('data-id', data[i].id);
        campaignRows.append(campaignCard.html());
        App.names.push(data[i].name);
      }
    });
    return App.initWeb3();
  },

  initWeb3: function() {
        // Is there is an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fallback to the TestRPC
      App.web3Provider = new Web3.providers.HttpProvider(App.url);
    }
    web3 = new Web3(App.web3Provider);

    ethereum.enable();

    // App.populateAddress();
    return App.initContract();
  },

  initContract: function() {
      $.getJSON('Donations.json', function(data) {
    // Get the necessary contract artifact file and instantiate it with truffle-contract
    var donationsArtifact = data;
    App.contracts.donations = TruffleContract(donationsArtifact);

    // Set the provider for our contract
    App.contracts.donations.setProvider(App.web3Provider);
    
    // App.getChairperson();
    return App.bindEvents();
  });
  },

  bindEvents: function() {
    $(document).on('click', '.btn-donate', App.handleDonation);
    // $(document).on('click', '#win-count', App.handleWinner);
    // $(document).on('click', '#register', function(){ var ad = $('#enter_address').val(); App.handleRegister(ad); });
  },

  populateAddress : function(){
    new Web3(new Web3.providers.HttpProvider(App.url)).eth.getAccounts((err, accounts) => {
      web3.eth.defaultAccount=web3.eth.accounts[0]
      jQuery.each(accounts,function(i){
        if(web3.eth.coinbase != accounts[i]){
          var optionElement = '<option value="'+accounts[i]+'">'+accounts[i]+'</option';
          jQuery('#enter_address').append(optionElement);  
        }
      });
    });
  },

  getChairperson : function(){
    App.contracts.donations.deployed().then(function(instance) {
      return instance;
    }).then(function(result) {
      App.chairPerson = result.constructor.currentProvider.selectedAddress.toString();
      App.currentAccount = web3.eth.coinbase;
      if(App.chairPerson != App.currentAccount){
        jQuery('#address_div').css('display','none');
        jQuery('#register_div').css('display','none');
      }else{
        jQuery('#address_div').css('display','block');
        jQuery('#register_div').css('display','block');
      }
    })
  },

  handleRegister: function(addr){
    var voteInstance;
    web3.eth.getAccounts(function(error, accounts) {
    var account = accounts[0];
    App.contracts.donations.deployed().then(function(instance) {
      voteInstance = instance;
      return voteInstance.register(addr, {from: account});
    }).then(function(result, err){
        if(result){
            if(parseInt(result.receipt.status) == 1)
            alert(addr + " registration done successfully")
            else
            alert(addr + " registration not done successfully due to revert")
        } else {
            alert(addr + " registration failed")
        }   
    })
    })
},

  handleDonation: function(event) {
    event.preventDefault();
    var campaignId = parseInt($(event.target).data('id'));
    var amount = parseInt(event.target.previousElementSibling.value);
    var donationsInstance;

    web3.eth.getAccounts(function(error, accounts) {
      var account = accounts[0];

      App.contracts.donations.deployed().then(function(instance) {
        donationsInstance = instance;

        event = donationsInstance.donate(campaignId, {from: account, value: amount*1e18});
        return event;
      }).then(function(result, err){
            if(result){
                console.log(result.logs);
                console.log(result.receipt.status);
                if(parseInt(result.receipt.status) == 1){   

                  var eventArgs = result.logs[0].args;

                  fetch('http://localhost:3000/donations/add',{
                    method: "POST",
                    headers:{'content-type': 'application/json'},
                    body: JSON.stringify({
                      "campaignId": parseInt(eventArgs['campaignId']),
                      "donatedBy": eventArgs['_from'],
                      "amount": parseInt(eventArgs['_value'])/1e18,
                    })
                  })
                  .then(resp => console.log(resp));

                  alert(account + " donation done successfully");
                }
                
                else
                alert(account + " donation not done successfully due to revert")
            } else {
                alert(account + " donation failed")
            }   
        });

      // App.contracts.donations.deployed().then(function(instance) {
      //   instance.events.Donation().on ("data",function(event) {
      //     if(!error) console.log(event);
      //     else console.log(`Error: ${error}`);
      //   });
      // });

    //   App.contracts.donations.deployed()
    //   .then(contractInstance => {
    //     const event = contractInstance.donate(campaignId, {from: account, value: amount*1e18}, (err, res) => {
    //       if(err) {
    //         throw Error(err)
    //       }
    //     })
    //     event.watch(function(error, result){
    //       if (error) { return console.log(error) }
    //       if (!error) {
    //         // DO ALL YOUR WORK HERE!
    //         let { args: { from, to, value }, blockNumber } = result
    //         console.log(`----BlockNumber (${blockNumber})----`)
    //         console.log(`from = ${from}`)
    //         console.log(`to = ${to}`)
    //         console.log(`value = ${value}`)
    //         console.log(`----BlockNumber (${blockNumber})----`)
    //       }
    //     })
    //   })
    //   .catch(e => {
    //     console.error('Catastrophic Error!')
    //     console.error(e)
    //   })
    });
  },

  handleWinner : function() {
    console.log("To get winner");
    var voteInstance;
    App.contracts.donations.deployed().then(function(instance) {
      voteInstance = instance;
      return voteInstance.reqWinner();
    }).then(function(res){
    console.log(res);
      alert(App.names[res] + "  is the winner ! :)");
    }).catch(function(err){
      console.log(err.message);
    })
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});

