// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.18 <0.8.20;

// Ungravel, ungravel.eth, GroupWalletFactory, GroupWalletMaster, GroupWallet, ProxyWallet, TokenMaster, ProxyToken, PrePaidContract, AuctionMaster, BiddingProxy, intDeedMaster, extDeedMaster, IntDeedProxy, Intentions by pepihasenfuss.eth 2017-2025, Copyright (c) 2025

// Intentions and Ungravel is entirely based on Ethereum Name Service, "ENS", the domain name registry.
// inspired by parity sampleContract, Consensys-ERC20 and openzeppelin smart contracts and others.

//   ENS, ENSRegistryWithFallback, PublicResolver, Resolver, FIFS-Registrar, Registrar, AuctionRegistrar, BaseRegistrar, ReverseRegistrar, DefaultReverseResolver, ETHRegistrarController,
//   PriceOracle, SimplePriceOracle, StablePriceOracle, ENSMigrationSubdomainRegistrar, CustomRegistrar, Root, RegistrarMigration are contracts of "ENS", by Nick Johnson and team.
//
//   Copyright (c) 2018, True Names Limited / ENS Labs Limited
//
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//   The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


interface AGWP {                                                                // Abstract and access to GWP, Group Wallet Proxy contract, the Voting and Multi-Sig-contract of each group, a proxy, belonging to the GroupWallet Master
  function getIsOwner(address _owner)      external view returns (bool);
  function getOwners()                     external view returns (address[] memory);
  function getTransactionsCount()          external view returns (uint);
  function getTransactionRecord(uint _tNb) external view returns (uint256);
  function getGWF()                        external view returns (address);
  function getAllTransactions()            external view returns (uint256[] memory transArr);
  
  function getMasterCopy()                                                    external view returns (address);
  function nameAuctionBidBucketLabel(bytes32 labelhash, address deedContract) external;
}

abstract contract AbstractTokenProxy_int {                                      // TokenProxy gives access to the Group Shares contract, aka TokenProxy contract, that comes with each group, a proxy contract that belongs to TokenMaster
  function name() external virtual view returns (string memory);
  function sellPrice() external view virtual returns (uint256 sp);
  function buyPrice() external view virtual returns (uint256 bp);
  function owner() external view virtual returns (address ow);
  function balanceOf(address tokenOwner) external virtual view returns (uint thebalance);
  function drainShares(bytes32 dHash, address from, address toReceiver) external virtual;
  function drainLegacyShares(bytes32 dHash, address from, address toReceiver) external virtual;
  function approve_v2d(address spender, uint tokens) external virtual;
  function transferFrom_78S(address from, address toReceiver, uint amount) external virtual;
  function tokenAllow(address tokenOwner,address spender) external virtual view returns (uint256 tokens);
  function transfer_G8l(address toReceiver, uint amount) external virtual;
  function sell_LA2(uint256 amount) external virtual;
  function upgradeTokenMaster(bytes32 dHash, address master) external payable virtual;
  function upgradeGWM(bytes32 dHash, address master) external payable virtual;
  function substring(bytes memory self, uint offset, uint len) public pure virtual returns(bytes memory);
}

contract AbstractBaseR_int {                                                    // BaseRegistrar belongs to the ENS - Ethereum Naming Service
  event NameMigrated(uint256 indexed id, address indexed owner, uint expires);
  event NameRegistered(uint256 indexed id, address indexed owner, uint expires);
  event NameRenewed(uint256 indexed id, uint expires);

  bytes32 public baseNode;                                                      // The namehash of the TLD, this registrar owns (eg, .eth, or .arb)
}

abstract contract AbstractETHRegController_int {                                // RegistrarController belongs to ENS, it handles the purchase and rent of domain names, s.a. "my-company.eth" | "your-company.arb"
  mapping(bytes32=>uint) public commitments;

  uint public minCommitmentAge;
  uint public maxCommitmentAge;

  address public nameWrapper;

  function rentPrice(string memory name, uint duration) view external virtual returns(uint);
  function available(string memory name) external virtual view returns(bool);
}

interface AbstractTM_ENS_int {                                                  // ENS Registry grants access to domain names and domain name properties
  event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
  event Transfer(bytes32 indexed node, address owner);
  event NewResolver(bytes32 indexed node, address resolver);
  event NewTTL(bytes32 indexed node, uint64 ttl);
  event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

  function setSubnodeRecord(bytes32 node, bytes32 label, address sub_owner, address sub_resolver, uint64 sub_ttl) external;
  function setOwner(bytes32 node, address set_owner) external;
  function owner(bytes32 node) external view returns (address);
  function recordExists(bytes32 node) external view returns (bool);
}

interface AbstractTM_Resolver_int {                                             // ENS Resolver provides the address and properties of domain names, s.a. "your-company.base", it resolves domain names to EVM addresses
  event AddrChanged(bytes32 indexed node, address a);
  event AddressChanged(bytes32 indexed node, uint coinType, bytes newAddress);
  event NameChanged(bytes32 indexed node, string name);
  event ABIChanged(bytes32 indexed node, uint256 indexed contentType);
  event PubkeyChanged(bytes32 indexed node, bytes32 x, bytes32 y);
  event TextChanged(bytes32 indexed node, string indexed indexedKey, string key);
  event ContenthashChanged(bytes32 indexed node, bytes hash);

  function ABI(bytes32 node, uint256 contentTypes) external view returns (uint256, bytes memory);
  function addr(bytes32 node) external view returns (address payable);
  function text(bytes32 node, string calldata key) external view returns (string memory);
  function name(bytes32 node) external view returns (string memory);
  function contenthash(bytes32 node) external view returns (bytes memory);

  function setABI(bytes32 node, uint256 contentType, bytes calldata data) external;
  function setAddr(bytes32 node, address r_addr) external;
  function setAddr(bytes32 node, uint coinType, bytes calldata a) external;
  function setName(bytes32 node, string calldata _name) external;
  function setText(bytes32 node, string calldata key, string calldata value) external;
  function setAuthorisation(bytes32 node, address target, bool isAuthorised) external;
}

abstract contract Abs_AuctionRegistrar_int {                                    // Auction Registrar is Vickrey Auction, controlled by Ungravel GroupWallets, in order to sell group shares to investors and to tame competition
  enum Mode { Open, Auction, Owned, Forbidden, Reveal, empty, Over }

  function startAuction_ge0(bytes32 _hash, uint revealP) public virtual payable;
  function state_pln(bytes32 _hash) public virtual view returns (Mode);
  function entries(bytes32 _hash) public virtual view returns (Mode, address, uint, uint, uint, uint, uint, uint);
}

abstract contract AbstractRR_int {                                              // Reverse Resolver and Reverse Default Resolver give access to the domain name, if only an address is given
  AbstractTM_Resolver_int public defaultResolver;
  function node(address addr) external virtual pure returns (bytes32);
}

abstract contract AbstractGWF_int {                                             // Group Wallet Factory, GWF, main Ungravel entry point coordinating Ungravel Groups and all activities, deploying ProxyGroupWallet, GWP, and ProxyToken, aka TokenProxy
  AbstractTM_Resolver_int             public  resolverContract;
  AbstractETHRegController_int        public  controllerContract;
  AbstractTM_ENS_int                  public  ens;
  AbstractBaseR_int                   public  base;
  AbstractRR_int                      public  reverseContract;
  Abs_AuctionRegistrar_int            public  auctionContract;

  function getProxyToken(bytes32 _domainHash) external view virtual returns (address p);
  function getGWProxy(bytes32 _dHash) external view virtual returns (address);
  function getIsOwner(bytes32 _dHash,address _owner) external view virtual returns (bool);
  function getOwner(bytes32 _domainHash) external view virtual returns (address);
  function domainReport(string calldata _dom,uint command) external payable virtual returns (uint256 report, address gwpc, address ptc, address gwfc, bytes memory structure);
  function getGWF() external view virtual returns (address);
  function tld() public view virtual returns (string memory);
}

//---------------------------------------------------------------------------------------------

// Attention: Any Group may send a LetterOfIntent, LoI, to any other Group, except of itself.
// Groups MUST be a part of Ungravel Society, they MUST belong to the Ungravel mesh of groups.
// Investors may send the intention to invest into any target group, e.g. "silvias-bakery.eth", a certain nb of shares
// to indicate that investor considers to participate in a Funding Auction to acquire the desired nb of shares or even more.
// If no group - aka external investor - indicates interest and the intention to invest and to participate in
// a Funding Auction, the fund raising group, e.g. "silvias-bakery.eth", cannot invite external investors to invest in a Funding Auction.
// Group members may participate in any Auction at any time. External investments require a valid and provable Letter of Intent, LoI.

// *** Hint: LoIs are also important in order to participate in and to profit from Ungravel Global Token, aka Ungravel Global Shares, in the future. (Ungravel Global Share Drop) ***

contract Intentions {
    address         internal masterCopy;                               // owner of contract / future use 
    AbstractGWF_int internal GWF;                                      // current GWF contract of chain aka GroupWallet Factory

    uint                                            public UNG_Mcap;   // total market cap of Ungravel Society on current chain, s.a. "mcap.arbitrum.arb" | "mcap.base.base", total sum of GWP marketCaps x1000

    address[]                                       private investors; // investor contract GWP addresses, array

    mapping(address => uint256)                     private balances;  // balance of investor in ETH at the time of LoI
    mapping(address => mapping(address => uint256)) private intended;  // nb of GroupShares to be acquired while taking part in a Funding Auctions: "The Intention" - seen from the investor
    mapping(address => address[])                   private intentInv; // target GWP to array of investor GWP contracts, seen from target groups

    mapping(address => mapping(address => uint256)) private invested;  // ETH or native currency amount, paid in a Funding Auctions, having completed Finalize Auction, seen from investor
    mapping(address => mapping(address => uint256)) private acquired;  // nb of GroupShares acquired, participating in a Funding Auctions, having completed Finalize Auction, seen from investor

    mapping(address => mapping(address => uint256)) private funded;    // ETH or native currency amount, received in a Funding Auctions, having completed an Auction, seen from target group
    mapping(address => mapping(address => uint256)) private sold;      // nb of GroupShares sold, running a Funding Auction, having completed the Auction, seen from target group

    mapping(address => mapping(address => bytes32)) private spice;     // bytes32 = uint256 spice value, seen from the investor
    mapping(address => uint256)                     private marketCap; // uint256 = market cap of individual groups in ETH or native currency x1000

    // ----------------------------------------------------------------------------------------
    
    uint256 private _guardCounter  = 1;
    address constant k_add00       = address(0x0);
    uint256 constant k_aMask       = 0x000000000000000000000000ffffffffffffffffffffffffffffffffffffffff;
    uint256 constant k_typeMask    = 0xf000000000000000000000000000000000000000000000000000000000000000; // command type = 4 bits


    event TestReturn(uint256 v1, uint256 v2, uint256 v3, uint256 v4);
    event Deposit(address from, uint256 value);
    event Deployment(address owner, address theContract);
    event DeploymentIntentions(address theContract, bytes32 dhash);
    event LetterOfIntent(address theInvestorAddress, address targetGWP_Address, uint256 nbOfShares);
    event StoreInvestment(address theInvestorAddress, address targetGWP_Address, uint256 nbOfShares, uint256 pricePaid);
    event StoreFunding(address targetGWP_Address, address theInvestorAddress, uint256 nbOfShares, uint256 pricePaid);

    modifier nonReentrant() {
      _guardCounter += 1;
      uint256 localCounter = _guardCounter;
      _;
      require(localCounter == _guardCounter,"re-entrance attack prohibited. Yeah!");
    }

    modifier ungravelGW(AGWP gwp) {                                                   // gwp MUST BE valid contract, a GroupWalletProxy belonging to Ungravel
      require(address(gwp)!=k_add00&&isContract(address(gwp))&&address(gwp.getGWF())==address(getGWF()),"* no UngravelGroup!"); // GWP uses GWF contract

      bytes32 h = hashOfGWP(gwp);
      require(h!=0x0&&getGWF().getOwner(h)==address(gwp), "* no UngravelGroup2!");    // the requested GWP owns its own dName, s.a. "silvias-bakery.eth" | "vitalik.arb" | "peters-bar.opt"
      require(address(getGWP(h))==address(gwp),           "* no UngravelGroup3!");    // GWP belongs to Ungravel Society
      _;
    }

    modifier hasTransactions(AGWP gwp) {                                              // at least 1 transaction of GWP required, otherwise, GWP did not yet store GWF
      require(gwp.getTransactionsCount()>0, "no transactions!");
      _;
    }

    function getMasterCopy() public view returns (address) {                          // get deployer address / for future use: Master Contract address
      return masterCopy;
    }

    function getGWF() public view returns (AbstractGWF_int) {                         // get GroupWallet Factory contract
      return GWF;
    }

    function getRegController() public view returns (AbstractETHRegController_int) {  // get controller contract of ENS, for renting and renewing domain names
      return AbstractETHRegController_int(getGWF().controllerContract());
    }

    function getAuctionMaster() public view returns (Abs_AuctionRegistrar_int) {      // get AuctionMaster contract address
      return Abs_AuctionRegistrar_int(getGWF().auctionContract());
    }

    function hashOfGWP(AGWP _gwp) internal view returns (bytes32) {                   // get domain name hash of GroupWalletProxy, GWP
      return bytes32(_gwp.getTransactionRecord(uint256(uint160(address(getGWF())))));
    }

    function getGWP(bytes32 _dhash) internal view returns (AGWP) {                    // get GroupWallet Proxy contract address of Group(_dhash)
      address gwp = getGWF().getGWProxy(_dhash);
      require(gwp!=address(0x0)&&isContract(gwp),"GW");
      return AGWP(gwp);
    }

    function getPTC(bytes32 _dhash) internal view returns (AbstractTokenProxy_int) {  // get GroupToken  Proxy contract address of Group(_dhash)
      return AbstractTokenProxy_int(getGWF().getProxyToken(_dhash));
    }

    function getName(bytes32 _dhash) internal view returns (string memory) {          // get GWP group name, from hash
      return getPTC(_dhash).name();
    }
    
    function getNodeHash(string memory dn) internal view returns (bytes32 hash) {     // get domain hash of "ethereum-foundation"
      return keccak256( abi.encodePacked( AbstractBaseR_int(getGWF().base()).baseNode(), keccak256( abi.encodePacked(dn) ) ) ); // domain e.g. 'ethereum-foundation'
    }

    // Attention: Any Group may send a LetterOfIntent, LoI, to any other Group, except of itself.
    // Groups MUST be a part of Ungravel Society, they MUST belong to the Ungravel mesh of groups.
    // Investors may send the intention to invest into any target group, e.g. "silvias-bakery.eth", a certain nb of shares
    // to indicate that investor considers to participate in a Funding Auction to acquire the desired nb of shares or even more.
    // If no group - aka external investor - indicates interest and the intention to invest and to participate in
    // a Funding Auction, the fund raising group, e.g. "silvias-bakery.eth", cannot invite external investors to invest in a Funding Auction.
    // Group members may participate in any Auction at any time. External investments require a valid and provable Letter of Intent, LoI.

    // *** Hint: LoIs are also important in order to participate and profit from Ungravel Global Token, aka Ungravel Global Shares, in the future. ***

    function saveLetterOfIntent(address target, uint nbOfShares) public payable nonReentrant ungravelGW(AGWP(target)) {
      require(address(target)!=address(msg.sender),                                     "LoI0!");       // target cannot be this GWP, groups MUST NOT invest in itself! Members can.

      require(address(target)!=k_add00&&isContract(address(target)),                    "LoI1!");       // target address is valid group wallet contract
      require(address(msg.sender)!=k_add00&&isContract(address(msg.sender)),            "LoI2!");       // origin address is valid group wallet contract

      AGWP  __gwp    = AGWP(target);
      AGWP  __gwpInv = AGWP(msg.sender);

      require(address(__gwp)!=k_add00&&address(__gwp.getGWF())==address(getGWF()),      "LoI3!");       // target GWP and this contract based on same GWF
      require(address(__gwpInv)!=k_add00&&address(__gwpInv.getGWF())==address(getGWF()),"LoI4!");       // sender GWP and this contract based on same GWF

      (address LOItargetAddr,uint tNb)=IntentTransactionRecord(AGWP(address(msg.sender)));
      require(tNb>0&&isContract(LOItargetAddr)&&target==LOItargetAddr,                  "LoI5!");       // LOI Intention transaction to identify target GWP

      bytes32 hash = hashOfGWP(__gwp);                                                                  // tArr[uint256(uint160(address(getGWF())))];
      require(hash!=0x0,                                                                "LoI6!");       // did find the dHash of "silvias-bakery.eth" GroupWallet, e.g.
      require(address(getGWP(hash))==address(target),                                   "LoI16!");      // GWP is Group of GWF, aka GWP belongs to Ungravel Society

      AbstractTokenProxy_int  __ptc = getPTC(hash);
      require(address(__ptc)!=k_add00,                                                  "LoI7!");       // did find the ProxyToken contract address of "silvias-bakery.eth"

      require(nbOfShares>0&&nbOfShares<=__ptc.balanceOf(target),                        "LoI8!");       // target owns at least nb of shares intented to be acquired

      require(getGWF().getOwner(hash)==target,                                          "LoI9!");       // target GWP contract owns GWP name, s.a. "silvias-bakery.eth"

      bytes32 hashInv = hashOfGWP(__gwpInv);                                                            // tArr[uint256(uint160(address(getGWF())))];
      require(hashInv!=0x0,                                                             "LoI10!");      // did find the dHash of "investor.eth" GroupWallet
      require(getGWF().getOwner(hashInv)==address(msg.sender),                          "LoI11!");      // investor GWP contract owns GWP name, s.a. "investor.eth"
      require(address(getGWP(hashInv))==msg.sender,                                     "LoI17!");      // GWP is Group of GWF, aka GWP belongs to Ungravel Society

      // check balance and cost

      AbstractETHRegController_int ctrl = getRegController();                                            // ENS RegistrarController, contract to rent domain names
      require(ctrl.rentPrice("abcdef",uint(86400*365))<=msg.value,                      "LoI12!");       // pay a small "rent" comparable to domain names to prohibit LoI spam

      balances[address(msg.sender)] = address(msg.sender).balance;                                       // save current ETH balance of potential investor
      intended[msg.sender][target]  = nbOfShares;                                                        // save nb of shares intended to be acquired
      investors.push(address(msg.sender));                                                               // save contract address GWP of potential investor in an array

      intentInv[target].push(address(msg.sender));                                                       // push investor GWP for target GWP

      emit LetterOfIntent(msg.sender, target, nbOfShares);
    }

    // Store relevant investment decisions to qualify GroupWallets for the Ungravel Global Share
    // GWP that invest in other groups and completing a Funding Auction, qualify for a future stake of the Ungravel Global Share, aka Ungravel Global Token, UGT (Ungravel Global Share Drop)
    // Hint: storeInvestment() is only called by GWP and execute finalize for external investors, it is NOT called for internal auctions!

    function storeInvestment(uint _nbOfShares, address _gwp, uint _pricePaidEth, bytes32 _salt) public payable nonReentrant ungravelGW(AGWP(msg.sender)) ungravelGW(AGWP(_gwp)) { // send from the investing GWP
      require(address(_gwp)!=k_add00&&isContract(address(_gwp))&&address(AGWP(_gwp).getGWF())==address(getGWF()),"* not an UngravelGroup!");
      require(_nbOfShares>0,"* not an UngravelGroup2!");
      require(_nbOfShares>0&&_pricePaidEth>0,"* not an UngravelGroup2b!");
      require(_nbOfShares>0&&_pricePaidEth>0&&(uint(_salt)!=0),"* not an UngravelGroup2c!");

      // save the nb of shares acquired, save the amount paid for the group shares, seen from the investor GWP

      acquired[msg.sender][_gwp] = _nbOfShares;                                                                                      // sender = investor did send _nbOfShares to receiving GWP
      invested[msg.sender][_gwp] = _pricePaidEth;                                                                                    // sender = investor did pay _price for _nbOfShares, re-adjusting group valuation


      // save the nb of group shares sold, save the amount received "the funding", for selling group shares, seen from the GWP that ran the Funding Auction and got funded

      sold[_gwp][msg.sender]     = _nbOfShares;                                                                                      // _gwp funded for selling _nbOfShares to sender = investor
      funded[_gwp][msg.sender]   = _pricePaidEth;                                                                                    // _gwp received _price ETH funding, group valuation adjusted appropriately

      spice[msg.sender][_gwp]    = _salt;                                                                                            // sender = investor stores the _salt = group name hash for this receiver

      uint cap                   =  uint( uint(1200000 * 100000) / _nbOfShares) * uint(_pricePaidEth);                               // recalculate new market cap of _gwp x 1000 in ETH or native currency (matic, POL)

      if (cap>0) {                                                                                                                   // avoid surprises
        UNG_Mcap = UNG_Mcap - marketCap[_gwp];                                                                                       // delete the old market cap of group x1000
        if (cap>marketCap[_gwp]) marketCap[_gwp] = cap;                                                                              // update new market cap, if greater than old market cap
        UNG_Mcap = UNG_Mcap + cap;                                                                                                   // sum-up total market cap of Ungravel Society on this chain
      }

      emit StoreInvestment(msg.sender,_gwp,_nbOfShares,_pricePaidEth);
      emit StoreFunding(_gwp,msg.sender,_nbOfShares,_pricePaidEth);
    }

    function getSpice(address _gwp) public view ungravelGW(AGWP(msg.sender)) ungravelGW(AGWP(_gwp)) returns (bytes32) {              // get spice of an investment decision, such as the "salt"
      return spice[msg.sender][_gwp];
    }

    function getMarketCap() public view ungravelGW(AGWP(msg.sender)) returns (uint) {                                                // get market cap in ETH or natCurr of calling GWP
      return uint(marketCap[msg.sender] / 1000);
    }

    function mCap(address _gwp) public view returns (uint) {                                                                        // get market cap in ETH or natCurr
      return uint(marketCap[_gwp] / 1000);
    }

    function getUNGmarketCap() public view returns (uint) {                                                                          // get market cap in ETH or natCurr of Ungravel Society on current chain, s.a. ""
      if (UNG_Mcap<=0) return 0;
      return uint(UNG_Mcap / 1000);
    }
    
    function didInvestTo(address _gwp) public view ungravelGW(AGWP(_gwp)) ungravelGW(AGWP(msg.sender)) returns (bool) {              // calling GWP did invest in a _gwp ?
      return (acquired[msg.sender][_gwp]>0) && (invested[msg.sender][_gwp]>0) && (getSpice(_gwp)!=0x0);
    }

    function didGetFundingFrom(address _gwp,address _inv) public view ungravelGW(AGWP(_gwp)) ungravelGW(AGWP(_inv)) returns (bool) { // The _gwp did receive funding from an _investor ?
      return (sold[_gwp][_inv]>0) && (funded[_gwp][_inv]>0) && (spice[_inv][_gwp]!=0x0);
    }

    function getFundingReport(address _gwp, address _inv) public view returns (uint256 mCapGWP, bytes32 dhash, uint256 loiShares, uint256 shares, uint256 price, uint256 mcap) {
      require(address(_gwp)!=k_add00&&isContract(address(_gwp))&&address(AGWP(_gwp).getGWF())==address(getGWF()),"* no UG");         // GWP uses GWF contract
      bytes32 h = hashOfGWP(AGWP(_gwp));
      require(h!=0x0&&getGWF().getOwner(h)==address(_gwp), "* no UG2");                                                              // the requested GWP owns its own dName, s.a. "silvias-bakery.eth" | "vitalik.arb" | "peters-bar.opt"
      require(address(getGWP(h))==address(_gwp),           "* no UG3");                                                              // GWP belongs to Ungravel Society

      require(address(_inv)!=k_add00&&isContract(address(_inv))&&address(AGWP(_inv).getGWF())==address(getGWF()),"* no UG4");        // investor uses GWF contract
      h = hashOfGWP(AGWP(_inv));
      require(h!=0x0&&getGWF().getOwner(h)==address(_inv), "* no UG5");                                                              // the requested GWP owns its own dName, s.a. "silvias-bakery.eth" | "vitalik.arb" | "peters-bar.opt"
      require(address(getGWP(h))==address(_inv),           "* no UG6");                                                              // GWP belongs to Ungravel Society

      uint256 cap = uint256(marketCap[address(_gwp)] / 1000);
      uint256 loi = uint256(getIntendedLOIShares(_gwp,_inv));
      uint256 acq = uint256(acquired[_inv][_gwp]);
      uint256 prc = uint256(invested[_inv][_gwp]);
      bytes32 hsh = bytes32(spice[_inv][_gwp]);

      return ( cap, hsh, loi, acq, prc, uint256(getUNGmarketCap()) );
    }
    
    function LoI_arrived_for_GWP(address target) public view ungravelGW(AGWP(target)) hasTransactions(AGWP(target)) returns (bool) { // Did a GroupWallet "target" receive a LoI from another group?
      return (intentInv[target].length>0) && (getIntendedNbOfShares(target)>0);
    }

    
    function getIntendedNbOfShares(address target) public view returns (uint) {                                                      // In case "target" GWP - GroupWallet proxy did reveive a LoI, get the nb of shares investor may acquire * this can become expensive in the future *
      uint j = investors.length;
      if (j==0) return 0;

      uint i=0;
      do {
        if (intended[investors[i]][target]>0) return intended[investors[i]][target];
        i++;
      } while(i<j); // * this can be expensive in the future *

      return 0;
    }

    function getGroupLOIinvestors(address target) public view ungravelGW(AGWP(target)) returns (address[] memory) {                  // return array of LOI investors addresses
      return intentInv[target];
    }


    function getIntendedLOIShares(address tg, address inv) public view ungravelGW(AGWP(tg)) ungravelGW(AGWP(inv)) returns (uint) {   // returns nb of shares of the investor that did send an LOI - or 0
      uint j = intentInv[tg].length;
      if (j==0) return 0;

      for(uint i=0; i<j; i++) {
        address invest = intentInv[tg][i];
        if (invest==inv) return intended[invest][tg];
      }
      return 0;
    }

    function intendedLOIShares(address inv) public view ungravelGW(AGWP(msg.sender)) ungravelGW(AGWP(inv)) returns (uint) {          // called by GWP directly
      uint j = intentInv[msg.sender].length;
      if (j==0) return 0;

      for(uint i=0; i<j; i++) {
        address investor = intentInv[msg.sender][i];
        if (investor==inv) return intended[inv][msg.sender];
      }
      return 0;
    }


    function intendedLOIInvestorName(address _iv) public view ungravelGW(AGWP(msg.sender)) ungravelGW(AGWP(_iv)) returns (string memory) { // called by GWP directlyg
      uint j = intentInv[msg.sender].length;
      if (j==0) return '';

      for(uint i=0; i<j; i++) {
        address inv = intentInv[msg.sender][i];
        if ((inv==_iv)&&(intended[inv][msg.sender]>0)) { 
          return string(abi.encodePacked(bytes32ToStr(toLowerCaseBytes32(mb32(bytes(getName(hashOfGWP(AGWP(inv))))))),tld())); // "Bee-jazz" gets "bee-jazz.eth"
        }
      }
      return '';
    }

    function getLOIInvestorName(address tg, address _iv) public view ungravelGW(AGWP(tg)) ungravelGW(AGWP(_iv)) returns (string memory) {  // get name of LOI investor
      uint j = intentInv[tg].length;
      if (j==0) return '';

      for(uint i=0; i<j; i++) {
        address inv = intentInv[tg][i];
        if ((inv==_iv)&&(intended[inv][tg]>0)) { 
          return string(abi.encodePacked(bytes32ToStr(toLowerCaseBytes32(mb32(bytes(getName(hashOfGWP(AGWP(inv))))))),tld())); // "Bee-jazz" gets "bee-jazz.eth"
        }
      }
      return '';
    }

    // --------------------- strings -------------------------------------------
    
    function strlen(string memory s) internal pure returns (uint) {
        uint len;
        uint i = 0;
        uint bytelength = bytes(s).length;
        for(len = 0; i < bytelength; len++) {
            bytes1 b = bytes(s)[i];
            if(b < 0x80) {
                i += 1;
            } else if (b < 0xE0) {
                i += 2;
            } else if (b < 0xF0) {
                i += 3;
            } else if (b < 0xF8) {
                i += 4;
            } else if (b < 0xFC) {
                i += 5;
            } else {
                i += 6;
            }
        }
        return len;
    }
    
    function mb32(bytes memory _data) private pure returns(bytes32 a) {
      // solium-disable-next-line security/no-inline-assembly
      assembly {
          a := mload(add(_data, 32))
      }
    }
    
    function bytes32ToStr(bytes32 _b) internal pure returns (string memory){ 
      bytes memory bArr = new bytes(32); 
      for (uint256 i;i<32;i++) { bArr[i] = _b[i]; } 
      return string(bArr); 
    }

    function toLowerCaseBytes32(bytes32 _in) internal pure returns (bytes32 _out){
      if ( uint256(uint256(uint256(_in) & k_typeMask) >> 252) < 6 ) return bytes32(uint256(uint256(_in) | 0x2000000000000000000000000000000000000000000000000000000000000000 ));
      return _in;
    }
    
    function memcpy(uint dest, uint src, uint len) private pure {
        // Copy word-length chunks while possible
        for (; len >= 32; len -= 32) {
            // solium-disable-next-line security/no-inline-assembly
            assembly {
                mstore(dest, mload(src))
            }
            dest += 32;
            src += 32;
        }
        
        if (len==0) return;

        // Copy remaining bytes
        uint mask = 256 ** (32 - len) - 1;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }
    }

    function substring(bytes memory self, uint offset, uint len) private pure returns(bytes memory) {
        require(offset + len <= self.length,"substring!!!");

        bytes memory ret = new bytes(len);
        uint dest;
        uint src;

        // solium-disable-next-line security/no-inline-assembly
        assembly {
            dest := add(ret, 32)
            src  := add(add(self, 32), offset)
        }
        memcpy(dest, src, len);

        return ret;
    }
    
    function delArr(string memory s) internal pure returns (uint8[] memory) {
        uint8[] memory delimiter = new uint8[](2);
        
        uint len;
        uint nb = 0;
        uint i = 0;
        uint bytelength = bytes(s).length;
        for(len = 0; i < bytelength; len++) {
            bytes1 b = bytes(s)[i];
            
            if (b==0x2e) {
              delimiter[nb] = uint8(i);
              nb++;
            }
              
            if(b < 0x80) {
                i += 1;
            } else if (b < 0xE0) {
                i += 2;
            } else if (b < 0xF0) {
                i += 3;
            } else if (b < 0xF8) {
                i += 4;
            } else if (b < 0xFC) {
                i += 5;
            } else {
                i += 6;
            }
        }

        return delimiter;
    }
    
    // --------------------- chain utils ----------------------------------------
  
    function isContract(address addr) internal view returns (bool) {
      uint size;
      assembly { size := extcodesize(addr) }
      return size > 0;
    }
    
    function auctionTransactionRecord(AGWP gwp) internal view returns (address,uint) {
      require(address(gwp)!=k_add00&&isContract(address(gwp)),"Intentions auctTRecord!");

      uint256 t;
      uint    i = gwp.getTransactionsCount();

      if (i==0) return (address(0x0),0);

      do {
        i--;
        t = gwp.getTransactionRecord(i);
      } while((i>0) && (t>0) && (t & k_typeMask != k_typeMask));
      
      if (t & k_typeMask == k_typeMask) return (address(uint160(t & k_aMask)),i);
      else return (address(0x0),0);
    }

    function IntentTransactionRecord(AGWP gwp) internal view returns (address,uint) {
      uint256 k_typeMask12 = 0xc000000000000000000000000000000000000000000000000000000000000000;

      require(address(gwp)!=k_add00&&isContract(address(gwp)),"Intentions intentTRecord!");

      uint256 t;
      uint    i = gwp.getTransactionsCount();

      if (i==0) return (address(0x0),0);

      do {
        i--;
        t = gwp.getTransactionRecord(i);
      } while((i>0) && (t>0) && (t & k_typeMask12 != k_typeMask12));
      
      if (t & k_typeMask12 == k_typeMask12) return (address(uint160(t & k_aMask)),i);
      else return (address(0x0),0);
    }
    
    function tld() public view returns (string memory) {
      uint chainId = block.chainid;
      if (chainId==1)        return ".eth";
      if (chainId==10)       return ".op";
      if (chainId==56)       return ".bsc";
      if (chainId==100)      return ".gnosis";
      if (chainId==130)      return ".uni";
      if (chainId==137)      return ".matic";
      if (chainId==1135)     return ".lisk";
      if (chainId==8453)     return ".base";
      if (chainId==42161)    return ".one";
      if (chainId==81457)    return ".blast";
      if (chainId==167000)   return ".tko";
      if (chainId==421614)   return ".arb";
      if (chainId==534352)   return ".scroll";
      if (chainId==11155111) return ".sepeth";
      if (chainId==11155420) return ".opt";
      return "";
    }

    function chainName() public view returns (string memory) {
      uint chainId = block.chainid;
      if (chainId==1)        return "mainnet";
      if (chainId==10)       return "optmain";
      if (chainId==56)       return "bscmain";
      if (chainId==100)      return "gnosis";
      if (chainId==130)      return "uniswap";
      if (chainId==137)      return "polygon";
      if (chainId==1135)     return "lisk";
      if (chainId==8453)     return "base";
      if (chainId==42161)    return "arbmain";
      if (chainId==81457)    return "blast";
      if (chainId==167000)   return "taiko";
      if (chainId==421614)   return "arbitrum";
      if (chainId==534352)   return "scroll";
      if (chainId==11155111) return "sepolia";
      if (chainId==11155420) return "optimism";
      return "";
    }

    function version() public pure returns(uint256 v) {
      return 20010023;
    }

    function withdraw() external {
      require(getMasterCopy()==msg.sender&&payable(address(uint160(msg.sender))).send(address(this).balance-1),"iW");
    }

    fallback() external payable {
      if (msg.value > 0) {
        emit Deposit(msg.sender, msg.value);
        return;
      }
      require(false,"Intentions!");
    }
    
    receive() external payable {
      emit Deposit(msg.sender, msg.value);
    }

    constructor (address _gwf) payable
    { 
      require(strlen(tld())>0&&address(_gwf)!=k_add00&&isContract(_gwf),"Intentions CONST!");
      require(version()>20010000,"Intentions VERS!");
      require(strlen(chainName())>0,"Intentions CHAIN!");

      masterCopy  = msg.sender;
      GWF         = AbstractGWF_int(_gwf);
      UNG_Mcap    = 0;

      emit Deployment(msg.sender, address(this));
      emit DeploymentIntentions(address(this), bytes32(getNodeHash(string(abi.encodePacked(chainName())))));
    }
}