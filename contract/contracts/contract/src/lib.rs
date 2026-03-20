#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Campaign {
    pub creator: Address,
    pub title: String,
    pub description: String,
    pub goal: i128,
    pub deadline: u64,
    pub raised: i128,
    pub withdrawn: bool,
}

#[contracttype]
pub enum DataKey {
    Campaign(u64),
    Donation(u64, Address),
    CampaignIds,
    CampaignCount,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn create_campaign(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        goal: i128,
        deadline: u64,
    ) -> u64 {
        creator.require_auth();
        assert!(goal > 0, "goal must be positive");
        assert!(
            deadline > env.ledger().timestamp(),
            "deadline must be in future"
        );

        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0);
        let id = count + 1;

        env.storage().persistent().set(&DataKey::CampaignCount, &id);

        let campaign = Campaign {
            creator,
            title,
            description,
            goal,
            deadline,
            raised: 0,
            withdrawn: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(id), &campaign);

        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::CampaignIds)
            .unwrap_or(Vec::new(&env));
        ids.push_back(id);
        env.storage().persistent().set(&DataKey::CampaignIds, &ids);

        id
    }

    pub fn donate(env: Env, donor: Address, campaign_id: u64, amount: i128) {
        donor.require_auth();
        assert!(amount > 0, "donation must be positive");

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        assert!(
            env.ledger().timestamp() <= campaign.deadline,
            "campaign ended"
        );

        let mut donation: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Donation(campaign_id, donor.clone()))
            .unwrap_or(0);

        donation += amount;
        campaign.raised += amount;

        env.storage()
            .persistent()
            .set(&DataKey::Donation(campaign_id, donor), &donation);
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);
    }

    pub fn withdraw(env: Env, creator: Address, campaign_id: u64) {
        creator.require_auth();

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        assert_eq!(campaign.creator, creator, "not creator");
        assert!(
            env.ledger().timestamp() > campaign.deadline,
            "deadline not passed"
        );
        assert!(campaign.raised >= campaign.goal, "goal not reached");
        assert!(!campaign.withdrawn, "already withdrawn");

        campaign.withdrawn = true;
        env.storage()
            .persistent()
            .set(&DataKey::Campaign(campaign_id), &campaign);
    }

    pub fn claim_refund(env: Env, donor: Address, campaign_id: u64) {
        donor.require_auth();

        let campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        assert!(
            env.ledger().timestamp() > campaign.deadline,
            "deadline not passed"
        );
        assert!(campaign.raised < campaign.goal, "goal was reached");

        let donation: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Donation(campaign_id, donor.clone()))
            .unwrap_or(0);
        assert!(donation > 0, "no donation to refund");

        env.storage()
            .persistent()
            .set(&DataKey::Donation(campaign_id, donor), &0i128);
    }

    pub fn get_campaign(env: Env, campaign_id: u64) -> Campaign {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found")
    }

    pub fn get_donation(env: Env, campaign_id: u64, donor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Donation(campaign_id, donor))
            .unwrap_or(0)
    }

    pub fn get_all_campaign_ids(env: Env) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::CampaignIds)
            .unwrap_or(Vec::new(&env))
    }
}

mod test;
