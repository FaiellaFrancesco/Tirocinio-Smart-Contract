// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title SystemAccessControl
 * @dev A simplified access control contract to manage roles and permissions.
 * This contract is inspired by OpenZeppelin's AccessControl but is self-contained
 * and implemented according to the provided specifications.
 */
contract SystemAccessControl {

    // Role constants
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant ADMIN_ROLE = keccak256(abi.encodePacked("ADMIN_ROLE"));
    bytes32 public constant VAULT_ROLE = keccak256(abi.encodePacked("VAULT_ROLE"));
    bytes32 public constant PRICE_PROVIDER_ROLE = keccak256(abi.encodePacked("PRICE_PROVIDER_ROLE"));
    bytes32 public constant LIQUIDATOR_ROLE = keccak256(abi.encodePacked("LIQUIDATOR_ROLE"));
    bytes32 public constant PAUSER_ROLE = keccak256(abi.encodePacked("PAUSER_ROLE"));

    // State variables
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }

    mapping(bytes32 => RoleData) private _roles;

    // Events
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    // Note: RoleAdminChanged event is part of OpenZeppelin's full AccessControl.
    // For this implementation, admin roles are fixed in the constructor.
    // event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);


    // Modifier
    modifier onlyRoleAdmin(bytes32 role) {
        _checkRoleAdmin(role, msg.sender);
        _;
    }

    /**
     * @dev Constructor sets up the initial roles.
     * The deployer (`msg.sender`) gets the DEFAULT_ADMIN_ROLE.
     * DEFAULT_ADMIN_ROLE is set as the admin for all other roles.
     */
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); // Grant DEFAULT_ADMIN_ROLE to deployer

        // Set DEFAULT_ADMIN_ROLE as the admin for all other roles
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(VAULT_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(PRICE_PROVIDER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(LIQUIDATOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role].members[account];
    }

    /**
     * @dev Returns the admin role that controls `role`.
     */
    function getRoleAdmin(bytes32 role) external view returns (bytes32) {
        return _roles[role].adminRole;
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * Requirements:
     * - Caller must have the admin role for the `role` being granted.
     *
     * Emits a {RoleGranted} event.
     */
    function grantRole(bytes32 role, address account) external onlyRoleAdmin(role) {
        _grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * Requirements:
     * - Caller must have the admin role for the `role` being revoked.
     *
     * Emits a {RoleRevoked} event.
     */
    function revokeRole(bytes32 role, address account) external onlyRoleAdmin(role) {
        _revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     * Roles can be renounced by calling `renounceRole(role, msg.sender)`.
     *
     * Requirements:
     * - `msg.sender` must be `account`.
     *
     * Emits a {RoleRevoked} event.
     */
    function renounceRole(bytes32 role, address account) external {
        if (msg.sender != account) {
            revert("SystemAccessControl: can only renounce roles for self");
        }
        _revokeRole(role, account);
    }

    // Internal helper functions

    /**
     * @dev Internal function to set the admin role for a given role.
     * Used in the constructor.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        // No RoleAdminChanged event emission as per prompt simplification for constructor setup
        _roles[role].adminRole = adminRole;
    }

    /**
     * @dev Internal function to grant a role and set its admin.
     * For DEFAULT_ADMIN_ROLE, adminOrMember is the first member and also its own admin.
     * For other roles, this is primarily used to grant the role to an initial member if needed,
     * but admin roles are set separately by _setRoleAdmin in the constructor.
     */
    function _setupRole(bytes32 role, address adminOrMember) internal {
        if (role == DEFAULT_ADMIN_ROLE) {
            _setRoleAdmin(role, role); // DEFAULT_ADMIN_ROLE is its own admin
        }
        _grantRole(role, adminOrMember);
    }

    /**
     * @dev Internal logic for granting a role.
     */
    function _grantRole(bytes32 role, address account) internal {
        if (!_roles[role].members[account]) {
            _roles[role].members[account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }

    /**
     * @dev Internal logic for revoking a role.
     */
    function _revokeRole(bytes32 role, address account) internal {
        if (_roles[role].members[account]) {
            _roles[role].members[account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }

    /**
     * @dev Internal function to check if `sender` has the admin role for `role`.
     * Used by the `onlyRoleAdmin` modifier.
     */
    function _checkRoleAdmin(bytes32 role, address sender) internal view {
        bytes32 adminRoleForGivenRole = _roles[role].adminRole;
        if (!_roles[adminRoleForGivenRole].members[sender]) {
            revert("SystemAccessControl: sender must be admin to grant/revoke role");
        }
    }
}