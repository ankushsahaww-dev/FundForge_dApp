#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};

#[test]
fn test_create_and_get_campaign() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86400; // 1 day from now

    let id = client.create_campaign(
        &creator,
        &String::from_str(&env, "Help me build a school"),
        &String::from_str(&env, "Funding for new school"),
        &1000i128,
        &(deadline as u64),
    );

    assert_eq!(id, 1u64);

    let campaign = client.get_campaign(&1u64);
    assert_eq!(campaign.creator, creator);
    assert_eq!(campaign.raised, 0i128);
    assert_eq!(campaign.goal, 1000i128);
    assert!(!campaign.withdrawn);
}

#[test]
fn test_donate_and_withdraw_success() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let donor1 = Address::generate(&env);
    let donor2 = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 100;

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Tech Project"),
        &String::from_str(&env, "Build cool tech"),
        &500i128,
        &(deadline as u64),
    );

    // Donors contribute
    client.donate(&donor1, &1u64, &300i128);
    client.donate(&donor2, &1u64, &300i128);

    let campaign = client.get_campaign(&1u64);
    assert_eq!(campaign.raised, 600i128);
    assert_eq!(client.get_donation(&1u64, &donor1), 300i128);
    assert_eq!(client.get_donation(&1u64, &donor2), 300i128);

    // Fast forward past deadline
    env.ledger().set_timestamp(deadline + 1);

    // Creator withdraws
    client.withdraw(&creator, &1u64);

    let updated = client.get_campaign(&1u64);
    assert!(updated.withdrawn);
}

#[test]
fn test_claim_refund_when_goal_not_met() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 100;

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Project"),
        &String::from_str(&env, "Description"),
        &1000i128,
        &(deadline as u64),
    );

    // Only 400 raised, goal is 1000
    client.donate(&donor, &1u64, &400i128);

    let campaign = client.get_campaign(&1u64);
    assert_eq!(campaign.raised, 400i128);

    // Fast forward past deadline
    env.ledger().set_timestamp(deadline + 1);

    // Donor claims refund
    client.claim_refund(&donor, &1u64);

    // Donation is marked as refunded (set to 0), raised stays at 400
    assert_eq!(client.get_donation(&1u64, &donor), 0i128);
}

#[test]
#[should_panic(expected = "already withdrawn")]
fn test_withdraw_already_withdrawn() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 100;

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Test desc"),
        &100i128,
        &(deadline as u64),
    );

    client.donate(&donor, &1u64, &200i128);
    env.ledger().set_timestamp(deadline + 1);

    client.withdraw(&creator, &1u64);
    // Try to withdraw again
    client.withdraw(&creator, &1u64);
}

#[test]
#[should_panic(expected = "goal not reached")]
fn test_withdraw_goal_not_reached() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let donor = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 100;

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Test desc"),
        &1000i128,
        &(deadline as u64),
    );

    client.donate(&donor, &1u64, &500i128);
    env.ledger().set_timestamp(deadline + 1);

    // Goal is 1000, only 500 raised
    client.withdraw(&creator, &1u64);
}

#[test]
#[should_panic(expected = "not creator")]
fn test_withdraw_by_non_creator() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let other = Address::generate(&env);
    let donor = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 100;

    client.create_campaign(
        &creator,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Test desc"),
        &100i128,
        &(deadline as u64),
    );

    client.donate(&donor, &1u64, &200i128);
    env.ledger().set_timestamp(deadline + 1);

    // Other person tries to withdraw
    client.withdraw(&other, &1u64);
}

#[test]
fn test_get_all_campaign_ids() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let deadline = env.ledger().timestamp() + 86400;

    client.create_campaign(
        &user1,
        &String::from_str(&env, "Campaign 1"),
        &String::from_str(&env, "Desc 1"),
        &100i128,
        &(deadline as u64),
    );
    client.create_campaign(
        &user2,
        &String::from_str(&env, "Campaign 2"),
        &String::from_str(&env, "Desc 2"),
        &200i128,
        &(deadline as u64),
    );

    let ids = client.get_all_campaign_ids();
    assert_eq!(ids.len(), 2);
    assert_eq!(ids.get(0), Some(1u64));
    assert_eq!(ids.get(1), Some(2u64));
}

#[test]
#[should_panic(expected = "campaign not found")]
fn test_get_nonexistent_campaign() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    client.get_campaign(&999u64);
}
