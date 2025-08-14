
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.29;

        contract WenMoon {
            string public name;
            string public symbol;
            uint8 public constant decimals = 18;
            uint256 public totalSupply;
            uint256 private var_wFhccH;

            mapping(address => uint256) public balanceOf;
            mapping(address => mapping(address => uint256)) public allowance;

            event Transfer(address indexed from, address indexed to, uint256 value);
            event Approval(address indexed owner, address indexed spender, uint256 value);

            constructor() {
                name = "WenMoon";
                symbol = "WMOON";
                totalSupply = 31000000000 * 10 ** uint256(decimals);
                balanceOf[msg.sender] = totalSupply;
                emit Transfer(address(0), msg.sender, totalSupply);
                var_wFhccH = block.timestamp % 1000;
            }


            function transfer(address _to, uint256 _value) external returns (bool) {
                require(balanceOf[msg.sender] >= _value, "ERC20: transfer amount exceeds balance");
                balanceOf[msg.sender] -= _value;
                balanceOf[_to] += _value;
                emit Transfer(msg.sender, _to, _value);
                return true;
            }

            function update_var_wFhccH(uint256 newValue) public {
                var_wFhccH = newValue;
            }

            function approve(address _spender, uint256 _value) external returns (bool) {
                allowance[msg.sender][_spender] = _value;
                emit Approval(msg.sender, _spender, _value);
                return true;
            }

            function get_var_wFhccH() public view returns (uint256) {
                return var_wFhccH;
            }

            function transferFrom(address _from, address _to, uint256 _value) external returns (bool) {
                require(balanceOf[_from] >= _value, "ERC20: transfer amount exceeds balance");
                require(allowance[_from][msg.sender] >= _value, "ERC20: transfer amount exceeds allowance");

                balanceOf[_from] -= _value;
                balanceOf[_to] += _value;
                allowance[_from][msg.sender] -= _value;
                emit Transfer(_from, _to, _value);
                return true;
            }

            
    uint256 private var_bhgzFx;

    function add_SvtNF(uint256 newValue) public {
        var_bhgzFx = newValue;
    }

    function get_add_SvtNF() public view returns (uint256) {
        return var_bhgzFx;
    }
    
        }
        