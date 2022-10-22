package Main;

import classesAndSkill.MageClass;

import classesAndSkill.RogueClass;

import classesAndSkill.WarriorClass;

import java.io.IOException;
import java.util.Scanner;
import mobs.mob;


/**
 *
 * @author Z1nk
 */
public class gameFlow {
      WarriorClass warriorStats = new WarriorClass();
      RogueClass rogueStats = new RogueClass();
      MageClass mageStats = new MageClass();
      Player MC = new Player();
      Scanner in = new Scanner(System.in);
     
      public void chooseClass() throws IOException{
        System.out.println("Unknown Entity: What's your name human?");
        String playerName = in.next();
   
        MC.setName(playerName);
        System.out.println("Hi " + MC.getName());
        System.out.println("Choose your desired class");
        System.out.println("1. Warrior" +"\n"+ "2. Rogue" +"\n"+ "3. Mage" +"\n"+ "Enter [1, 2 or 3]");
     
        
       boolean x = false;
      do{
      int i = in.nextInt();  
      if (i == 1){
       System.out.println("You choose to be a Warrior");
       MC.setClassName("Warrior");
       MC.setHealthPower(warriorStats.getDefaultHP());
       MC.setStamina(warriorStats.getDefaultStamina());
       MC.setMana(warriorStats.getDefaultMana());
       MC.setLevel(warriorStats.getDefaultLevel());
       MC.firstSkill("Horizontal Slash", 7f, 1.5f * 7f);
       MC.secondSkill("Vertical Slash", 8f, 1.5f * 8f);
       MC.thirdSkill("Shield Bash", 1f, 1.5f * 1f);
       MC.setIntelligence(2);
       MC.setAgility(3);
       MC.setStrength(5);
       MC.setGold(10);
       
      x = true;
      }else if( i == 2){
     System.out.println("You choose to be a Rogue");
       MC.setClassName("Rogue");
       MC.setHealthPower(rogueStats.getDefaultHP());
       MC.setStamina(rogueStats.getDefaultStamina());
       MC.setMana(rogueStats.getDefaultMana());
       MC.setLevel(rogueStats.getDefaultLevel());
       MC.firstSkill("DaggerSlash", 7f, 1.5f * 7f);
       MC.secondSkill("PoisonBlade", 8f, 1.5f * 8f);
       MC.thirdSkill("Evasion", 0f, 1.5f * 0f);
       MC.setIntelligence(3);
       MC.setAgility(5);
       MC.setStrength(2);
       MC.setGold(10); 
     x = true;
      }else if(i == 3){
          System.out.println("You choose to be a Mage");
       MC.setClassName("Mage");
       MC.setHealthPower(mageStats.getDefaultHP());
       MC.setStamina(mageStats.getDefaultStamina());
       MC.setMana(mageStats.getDefaultMana());
       MC.setLevel(mageStats.getDefaultLevel());
       MC.firstSkill("FireBall", 5f, 1.5f * 75);
       MC.secondSkill("CompressedWind", 6f, 1.5f * 6f);
       MC.thirdSkill("WaterSplash", 4f, 1.5f * 4f);
       MC.setGold(10);
       MC.setIntelligence(5);
       MC.setAgility(2);
       MC.setStrength(3);
      x = true;
      
      }else{
      
      System.out.println("Try again");
      x = false;
      }
      }while (x == false);
      
}
      public void displayPlayerStats(){
      System.out.println("-------------------------------------");
      System.out.println(MC.getName() + "["+MC.className+"]"+"\n" 
              + "\n" 
              + "Health: " + MC.getHealthPower() + "            "+"Level: "+MC.getLevel()+"\n" 
              + "Stamina: "+ MC.getStamina()+"\n" 
              + "Mana: " + MC.getMana());
       System.out.println("-------------------------------------");
       System.out.println("Skills " + "\n"
               +"\n"
               + MC.skillName[1] + "          " + "Damage: " + MC.skillDamage[1] + "\n"
                + MC.skillName[2] + "          " + "Damage: " + MC.skillDamage[2] + "\n"
       + MC.skillName[3] + "          " + "Damage: " + MC.skillDamage[3]
       );
      
      }
      
      public void adventureTime(){
          displayPlayerStats();
          System.out.println();
          System.out.println();
          System.out.println("-------------------------------------");
      System.out.println("You want to go on a adventure?");
         System.out.println("----------------------------------");
    System.out.println("1.Yes                    2.No");
     System.out.println("            3. Exit");
    System.out.println("----------------------------------");
      Scanner choose = new Scanner(System.in);
   
      boolean x = true;
       do{    
      int u = choose.nextInt();
      if(u == 1){
          System.out.println();
          System.out.println("----------------------------------");
          System.out.println();
          System.out.println("Walking to the woods...");
          System.out.println();
       x = false;
      }else if(u == 2){
       x = false;
      }else if(u == 3){
       System.out.println("Quit Game?" + "[y/n]");   
          String y = "y",n = "n", exit;
       exit = in.next();
    if(exit.equalsIgnoreCase(y)){
    System.exit(0);
    }else if(exit.equalsIgnoreCase(n)){
    //do nothing.
    
    }else{
    System.out.println("Try again");
    }
      System.exit(0);
      
      
      }else{
         
      System.out.println("Try again");
       x = true;
          }
      }while(x == true);
      
      }
      public void gameBattle(){
      mob mob = new mob();
      boolean x = false;
      
     
      adventureTime();
      do{
          
    mob.enemyEncounter();
    mob.Appeared();
    gameTempBattleStats temp = new gameTempBattleStats();
    temp.setEnemyTempName(mob.Name());
    temp.setEnemySkillName(mob.skillName());
    temp.setEnemyTempHealth(mob.Health());
    temp.setEnemyTempDamage(mob.Damage());
    temp.setPlayerTempHealth((float) MC.getHealthPower());
    temp.setPlayerTempStamina((float) MC.getStamina());
    temp.setPlayerTempMana(MC.getMana());
    
    while(mob.statusEncounter == true){
    System.out.println("----------------------------------");
    System.out.println("1. Attack                 2.Run");
     System.out.println("            3. Go Home");
    System.out.println("----------------------------------");
    System.out.println();
    int i;
    i = in.nextInt();
    if(i == 1){
        do{
            if(temp.enemyTempHealth(0) > 0){
    temp.enemyTempHealth(MC.useSkill());
  System.out.println(mob.name + "\n" + "Health: " + temp.enemyTempHealth(0));
  System.out.println("----------------------------------");
  System.out.println(mob.name + " uses " + temp.enemySkillName() + " deals " + temp.enemyTempDamage());
  temp.playerTempHealth((float) temp.enemyTempDamage());
    System.out.println();
  System.out.println(MC.name + "\n" + "Health: " + temp.playerTempHealth(0));
  System.out.println("----------------------------------");
    
            }else if(temp.playerTempHealth(0) <= 0){
                System.out.println("You died");
                mob.statusEncounter = false;
           
            }else{
             System.out.println("You won!");
             mob.statusEncounter = false;
            }
        }while(mob.statusAlive == true && mob.statusEncounter == true);
    }else if(i == 2){
    
    mob.statusEncounter = false;
    }
    else if(i == 3){
       System.out.println("You sure you want to go home?" + "[y/n]");
       String u, y = "y", n ="n";
       
       u = in.next();
    if(u.equalsIgnoreCase(y)){
    gameBattle();
    }else if(u.equalsIgnoreCase(n)){
    //do nothing.
    
    }else{
    System.out.println("Try again");
    }
    }else{
    
    System.out.println("Try again");
    }
    }
      }while(mob.statusAlive == true);
      }
      public void startGame() throws IOException{
          chooseClass();
          gameBattle();
      }
}   
