package Trash;


import Main.Player;
public class RogueSkillSystem {
    private int n = 4;
   public String skillName;
   public float effect;
   protected float skillDamage;
   public  float minusMana = 1.5f;
   public String[] skills = new String[4];
   
  public float skillDaggerSlash(){
         this.skillName = "DaggerSlash";
  
    this.minusMana = (int) (skillDamage * minusMana);
   this.skillDamage = 5f; 
        return skillDamage;
    }

    public float skillPoisonBlade(){
          this.skillName = "PoisonBlade";
    this.skillDamage = 7f;
    this.minusMana = (int) (skillDamage * minusMana);
        return skillDamage;
    
    }
   
    public float skillEvasion(){//no damage
    this.skillName = "Evasion";
    this.skillDamage = 0f;
    this.effect = 0f;//can dodge
    this.minusMana = (int) (skillDamage * minusMana);
    return 3f;
    
    }
    public void chooseSkill(int choice){
   
    
    if(skills[choice] == skills[1]){  
    skillDaggerSlash();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    }else if(skills[choice] == skills[2]){  
    skillPoisonBlade();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    }else if(skills[choice] == skills[3]){  
    skillEvasion();
    System.out.println("You used: "+skillName+"\n"+"Damage: "+ skillDamage );
    
    }
    }
    public void currentSkills(){
       skillDaggerSlash();
       this.skills[1] = skillName;
       skillPoisonBlade();
       this.skills[2] = skillName;
       skillEvasion();
       this.skills[3] = skillName;
       
    }
    public void displaySkills(){
    for(int i = 1; i < n; i++){
               System.out.println( i + ". "+ skills[i]);
               }
    }
}
