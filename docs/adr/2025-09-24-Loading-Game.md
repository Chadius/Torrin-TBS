# Loading the game state
This is a multistep process that retrieves multiple resources and may fail due to bad versions or invalid state.

We also want this to run concurrently with the game.

If no progress is given, we'll load the title screen.

# Loading PlayerProgress file
## Game loads new game
When the player starts the game, we need to load the campaign.

Create an empty PlayerProgress object. Populate the load state with it.

```mermaid
graph TD;
    User_Starts_new_name-->PlayerProgress_Created;
    PlayerProgress_Created-->Set_PlayerProgress;
    Set_PlayerProgress-->Stop_PlayerProgress_load;
```

## User loads PlayerProgress file
The user specifies they want to load a file noting the progress they made through the game.
They may click on a Load Progress button on any menu that has one.
- Open a file dialog so they can pick the file.
- The user may cancel. Send a message they did and stop trying to load. 
- The file may fail to open (not JSON, I/O failure, etc.). Send a message about the failure and stop trying to load.

If the message loads properly, populate the load state with the loaded PlayerProgress.

```mermaid
graph TD;
    User_Requests_Loading_File-->Start_PlayerProgress_load;
    Start_PlayerProgress_load-->Open_file_dialog;
    Open_file_dialog-->User_cancels;
    Open_file_dialog-->File_error;
    User_cancels-->Send_cancel_message;
    Send_cancel_message-->Stop_PlayerProgress_load;
    File_error-->Send_error_message;
    Send_error_message-->Stop_PlayerProgress_load;
    Open_file_dialog-->PlayerProgress_Loaded;
    PlayerProgress_Loaded-->Set_PlayerProgress;
    Set_PlayerProgress-->Stop_PlayerProgress_load;
```

# PlayerProgress File Is set
Now that the player progress is set, we need to change the game state to match it.
No matter what, we'll make a backup of the state just in case we need to revert it all.

## Backup game state
We need to ask all the subsystems to back up their progress.

We'll make a PlayerProgress object as the backup, and ask each active subsystem to save to it.

```mermaid
graph TD;
    Request_Start_backup-->Backup_campaign_data;
    Backup_campaign_data-->Backup_mission_data;
```

# Restore backup game state
We made a PlayerProgress as the backup, so we just tell the loader to use the backup file to load.

```mermaid
graph TD;
    Request_Start_backup-->Set_PlayerProgress_Backup;
    Set_PlayerProgress_Backup-->Stop_backup;
```

# Applying PlayerProgress
Depending on what subsystems are present, we'll keep trying to load until it is exhausted.
If any part fails, we'll try to Restore the backup game state.
If the backup fails, we'll create a blank PlayerProgress and load the title screen.

We can load the mission and player army at the same time, but we'll wait to load resources until both complete.

## Applying PlayerProgress Main File
```mermaid
graph TD;
    PlayerProgress_main_ready-->Load_Campaign;
    Load_Campaign-->Load_Mission;
    Load_Campaign-->Load_PlayerArmy;
    Load_Mission-->Load_Resources;
    Load_PlayerArmy-->Load_Resources;
    Load_Resources-->Success;
    Success-->Stop_Applying;
```

## Load Campaign
We may have already loaded the campaign (we're in the same campaign, and we roll back to a previous mission.)
The campaign may also not be loaded yet.
In both situations, we'll try to retrieve it from storage.
Otherwise, we can skip loading the campaign file (but we have to check on other resources.)

```mermaid
graph TD;
    Check_current_campaignId-->Already_loaded;
    Already_loaded-->Find_Mission_To_Load;
    Check_current_campaignId-->Need_to_load_new_campaign;
    Need_to_load_new_campaign-->Load_Campaign_Data;
    Load_Campaign_Data-->Load_Campaign_Failed;
    Load_Campaign_Failed-->Report_Error;
    Report_Error-->Stop_loading;
    Load_Campaign_Data-->Load_Campaign_Success;
    Load_Campaign_Success-->Add_Resources;
    Add_Resources-->Load_Mission;
    Load_Campaign_Success-->Find_Mission_To_Load;
    Find_Mission_To_Load-->No_Mission_Found;
    Find_Mission_To_Load-->Found_Mission;
    Found_Mission-->Load_Mission;
    Load_Mission-->Stop_loading;
    No_Mission_Found-->Load_first_mission;
    Load_first_mission-->Stop_loading;
```

### Load Mission
Actually loading the game state requires loading the mission data, the player's army, and then trying to place everything.
It's easier if I just reload the mission no matter what, that way I don't have to deal with state.
Once that's done, load the player army.

```mermaid
graph TD;
    Load_Mission_Data-->Load_Mission_Failed;
    Load_Mission_Failed-->Report_Error;
    Load_Mission_Data-->Add_Mission_Resources;
    Add_Mission_Resources-->Load_Mission_Success;
    Load_Mission_Success;
```

### Load Player Army
The player army consists of the built-in teammates. Later it will handle leveling up and applying it to their level ups.

```mermaid
graph TD;
    Load_PlayerArmy-->Load_PlayerArmy_Failed;
    Load_PlayerArmy_Failed-->Report_Error;
    Load_PlayerArmy-->Add_PlayerArmy_Mission_Resources;
    Add_PlayerArmy_Mission_Resources-->Load_PlayerArmy_Success;
    Load_PlayerArmy_Success;
```

## Loading Resources
These are media files we need to load, usually images. All of this is asynchronous, so we'll have to wait for everything to load.

Files may fail to load. Right now we have a naive approach that assumes 1 attempt is all we need. We'll add retries and a dead letter queue later on.

We may mark resources as necessary in the future so if they fail this step fails. But for now we just poll until they all complete.

```mermaid
graph TD;
    Look_For_More_Pending_Loads-->More_Pending_Loads;
    Look_For_More_Pending_Loads-->Loading_Is_Active;
    More_Pending_Loads-->Activate_Loading;
    Loading_Is_Active-->Look_For_More_Pending_Loads;
    Activate_Loading-->Look_For_More_Pending_Loads;
    Look_For_More_Pending_Loads-->No_More_Pending_Or_Loading;
    Look_For_More_Pending_Loads-->Loading_Resource_Failed;
    Loading_Resource_Failed-->Report_And_Continue;
    Report_And_Continue-->Look_For_More_Pending_Loads;
    No_More_Pending_Or_Loading-->Resources_Success;
```
